const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const web=path.join(__dirname,'../../cindy-simulator/vendor/baguette/Baguette_Baguette.bundle/Web');
test('opening and reconnecting the flat viewer reads the guest orientation without writing it',()=>{
 const source=fs.readFileSync(path.join(web,'sim-native.js'),'utf8');
 assert.ok(!source.includes('resetToPortrait'));
 assert.ok(!source.includes('cindyOrientation'));
 const callbacks=source.slice(source.indexOf('  function sessionCallbacks('),source.indexOf('  function startSession('));
 const snap=source.slice(source.indexOf('  function snapOrientation('),source.indexOf('  // Map a normalized coord'));
 const make=()=>{
  const sent=[],context={document:{getElementById:()=>null},routeStreamText:()=>false,fetch:()=>assert.fail('viewer initialization must not write orientation')};
  vm.createContext(context);
  vm.runInContext("let deviceMode=false,foldable=false,currentOrientation='portrait',orientationIndex=0,rotationDegrees=0;const ORIENTATION_CYCLE=['portrait','landscape-left','portrait-upside-down','landscape-right'];function orientationCycle(){return ORIENTATION_CYCLE;}"+snap+callbacks,context);
  context.active={send:p=>sent.push(p)};vm.runInContext('let session=active',context);
  return {context,sent,callbacks:context.sessionCallbacks(),orientation:()=>vm.runInContext('currentOrientation',context)};
 };
 const reply=orientation=>({type:'describe_ui_result',ok:true,tree:{screen:{orientation}}});
 for(const orientation of ['portrait','landscape-left','portrait-upside-down','landscape-right']){
  const f=make();f.callbacks.onOpen();assert.deepEqual(JSON.parse(JSON.stringify(f.sent)),[{type:'describe_ui',x:1,y:1}]);
  assert.equal(f.callbacks.onText(reply(orientation)),true);assert.equal(f.orientation(),orientation);
  // A format swap or reload uses a fresh callback and observes the device again.
  const next=f.context.sessionCallbacks();next.onOpen();next.onText(reply('landscape-right'));assert.equal(f.orientation(),'landscape-right');
 }
 for(const failure of [{type:'describe_ui_result',ok:false},{type:'describe_ui_result',ok:true,tree:{}},reply('invalid')]){
  const f=make();f.callbacks.onOpen();f.callbacks.onText(failure);assert.equal(f.orientation(),'portrait');
 }
 const manual=make();manual.callbacks.onOpen();vm.runInContext("currentOrientation='landscape-right'",manual.context);
 manual.callbacks.onText(reply('landscape-left'));assert.equal(manual.orientation(),'landscape-right','late read cannot undo explicit rotation');
 const old=make();old.callbacks.onOpen();old.context.active={send:p=>old.sent.push(p)};vm.runInContext('session=active',old.context);
 old.callbacks.onText(reply('landscape-left'));assert.equal(old.orientation(),'portrait','retired streams cannot change a newer view');
 for(const mode of ['deviceMode','foldable']){
  const f=make();vm.runInContext(`${mode}=true`,f.context);f.callbacks.onOpen();assert.equal(f.sent.length,0,'physical devices and the 3D panel retain their own orientation paths');
 }
});

test('live panel updates remap taps and drags in both directions without resetting manual rotation',async()=>{
 const streams=[],sent=[],frames=new Map();let nextFrame=0;
 const flush=()=>{for(const [id,fn] of frames){frames.delete(id);fn();}};
 const context={window:{},URLSearchParams,requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),location:{protocol:'http:',host:'localhost'},fetch:async()=>({ok:true,json:async()=>({variantSets:[]})})};
 const native=fs.readFileSync(path.join(web,'sim-native.js'),'utf8');
 vm.createContext(context);
 vm.runInContext("let render3DPanel=null,foldable=true,currentLitPanel='primary',currentOrientation='portrait',orientationIndex=0;const ORIENTATION_CYCLE=['portrait','landscape-left','portrait-upside-down','landscape-right'];"+native.slice(native.indexOf('  function orientationCycle()'),native.indexOf('  // Apply orientation visually:'))+native.slice(native.indexOf('  function syncLitPanel('),native.indexOf('  // Theme toggle.'))+native.slice(native.indexOf('  function visualToPortraitNorm('),native.indexOf('  // Map a screen-edge name')),context);
 vm.runInContext(fs.readFileSync(path.join(web,'sim-3d.js'),'utf8'),context);
 context.window.Baguette={_ScreenPieces:{fromMessage:()=>({length:1})}};
 context.window.StreamSession=class {constructor(options){streams.push(options);}start(){}stop(){}send(payload){sent.push(payload);return true;}};
 const panel=new context.window.Sim3DPanel();
 context.testPanel=panel;vm.runInContext('render3DPanel=testPanel',context);
 // DOM/canvas are not needed to exercise production attach, stream callbacks,
 // page orientation state and the actual outgoing coordinate remapper.
 for(const method of ['renderLoading','renderControls','mountStage','setState','cancelPointer','placeButtons','placePosePicker'])panel[method]=()=>{};
 panel.canvas={};panel.outputSize=()=>({width:100,height:100});
 await panel.attach(null,null,'00000000-0000-4000-8000-000000000001',{onLitPanelChange:context.syncLitPanel});
 const emit=litPanel=>streams.at(-1).onText({type:'screen_quad',litPanel});
 const tap=()=>context.remapEnvelopeToPortrait({type:'tap',x:20,y:30,width:100,height:100});
 emit('secondary');assert.deepEqual([tap().x,tap().y],[30,80]);
 flush();assert.equal(sent.at(-1).orientation,'landscape-left');
 const drag=context.remapEnvelopeToPortrait({type:'swipe',startX:20,startY:30,endX:40,endY:50,width:100,height:100});
 assert.deepEqual([drag.startX,drag.startY,drag.endX,drag.endY],[30,80,50,60]);
 vm.runInContext("currentOrientation='landscape-right'",context);
 panel.setInterfaceOrientation('landscape-right');flush();
 emit('secondary');assert.deepEqual([tap().x,tap().y],[70,20]);
 assert.equal(panel.interfaceOrientation,'landscape-right');
 emit('bogus');assert.deepEqual([tap().x,tap().y],[70,20]);
 emit('primary');assert.deepEqual([tap().x,tap().y],[20,30]);
 flush();assert.equal(sent.at(-1).orientation,'portrait');assert.equal(vm.runInContext('orientationIndex',context),0);
 // A later camera update must not resurrect the pre-fold manual rotation.
 panel.sendCamera();flush();assert.equal(sent.at(-1).orientation,'portrait');
 const old=streams.at(-1);await panel.attach(null,null,panel.udid,{});
 old.onText({type:'screen_quad',litPanel:'secondary'});assert.deepEqual([tap().x,tap().y],[20,30]);
 emit('secondary');assert.deepEqual([tap().x,tap().y],[30,80]);
 flush();assert.equal(sent.at(-1).orientation,'landscape-left');assert.equal(vm.runInContext('orientationIndex',context),1);
 emit('primary');assert.deepEqual([tap().x,tap().y],[20,30]);
});
