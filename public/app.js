(() => {
  'use strict';
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const W = 1000, H = 620;
  const $ = (id) => document.getElementById(id);
  const students = [];
  const shirtColors = ['#5477df','#e46f68','#46a88a','#e3a344','#9a6be4','#3d9dbb','#e27da7'];
  const hairColors = ['#3f2d28','#2c2828','#664332','#43352f','#292a35'];
  const firstNames = ['An','Bình','Chi','Dũng','Hà','Khánh','Linh','Minh','Ngọc','Phúc','Quân','Trang','Vy','Huy'];
  const surnames = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Võ','Đặng'];
  const personalities = ['diligent','curious','active','playful','quiet','sleepy','leader'];
  const personalityNames = {diligent:'Chăm chỉ',curious:'Tò mò',active:'Năng động',playful:'Hay đùa',quiet:'Trầm tính',sleepy:'Hay buồn ngủ',leader:'Thủ lĩnh'};
  const behaviorNames = {auto:'Tự động',listen:'Nghe giảng',write:'Ghi chép',raise:'Giơ tay',read:'Đọc sách',talk:'Nói chuyện',sleep:'Ngủ gật',play:'Chơi với bạn',wander:'Đi dạo',follow:'Theo cô giáo',home:'Ra về',teach:'Giảng bài',help:'Giúp học sinh',check:'Kiểm tra bài',walk:'Quan sát lớp',break:'Nghỉ ở sân'};
  const schedule = [
    {time:420, label:'Vào trường', desc:'Chào nhau, cất cặp và chuẩn bị bài', tag:'Đầu ngày'},
    {time:450, label:'Học bài', desc:'Cô giảng bài, học sinh nghe và ghi chép', tag:'Tiết 1'},
    {time:540, label:'Ra chơi', desc:'Ra sân, trò chuyện và vận động', tag:'Giải lao'},
    {time:560, label:'Học bài', desc:'Tiếp tục học và làm bài tập', tag:'Tiết 2'},
    {time:650, label:'Ăn trưa', desc:'Nghỉ ngơi và ăn trưa', tag:'Buổi trưa'},
    {time:690, label:'Học bài', desc:'Học nhóm, đọc sách và làm bài', tag:'Tiết 3'},
    {time:810, label:'Ra chơi', desc:'Vận động ngoài sân trường', tag:'Giải lao'},
    {time:825, label:'Sinh hoạt lớp', desc:'Cô nhận xét, cả lớp tổng kết ngày học', tag:'Cuối buổi'},
    {time:870, label:'Ra về', desc:'Thu dọn đồ dùng và ra cổng trường', tag:'Tan học'}
  ];
  let running = true, speed = 1, simTime = 450, lastFrame = 0, minuteAccumulator = 0;
  let selectedId = 's0', selectedActor = null, sceneMode = 'auto', lastPeriodKey = '', lastEventKey = '', lastAutoBehaviorCheck = 0, teacherStyle = 'balanced';
  let lastLogMinute = -1;
  const teacher = {id:'teacher', type:'teacher', name:'Cô giáo Mai', x:500,y:143,tx:500,ty:143, color:'#e99a52', hair:'#332b2a', skin:'#efc4a0', personality:'leader', behaviorOverride:'auto', focus:95, state:'Giảng bài', stateKey:'teach', outfit:'teacher', visible:true, phase:0, moving:false};
  for (let i=0;i<14;i++) {
    const col = i%4, row = Math.floor(i/4);
    students.push({id:`s${i}`, type:'student', name:`${surnames[i%surnames.length]} ${firstNames[i]}`, x:250+col*165, y:245+row*95, tx:250+col*165, ty:245+row*95, homeX:250+col*165, homeY:245+row*95, color:shirtColors[i%shirtColors.length], hair:hairColors[i%hairColors.length], skin:['#f2c7a4','#d9a477','#f0d0b4','#be855e'][i%4], personality:personalities[i%personalities.length], behaviorOverride:'auto', focus: [85,68,74,48,92,77,63,81,57,70,88,52,95,73][i], state:'Nghe giảng', stateKey:'listen', visible:true, phase:Math.random()*6.28, moving:false, isGirl:i%3===1 || i%5===2, seat: i});
  }
  const actors = [teacher, ...students];

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const rand = (a,b)=>a+Math.random()*(b-a);
  const pick = (a)=>a[Math.floor(Math.random()*a.length)];
  const fmtTime = (m)=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.floor(m)%60).padStart(2,'0')}`;
  const currentSchedule = () => { let found=schedule[0]; for (const e of schedule) if(e.time<=simTime) found=e; else break; return found; };
  const isOutsideActivity = (label) => ['Ra chơi','Ăn trưa','Vào trường','Ra về','Hoạt động tự do'].includes(label);
  const periodIs = (label) => currentSchedule().label === label;
  const activeScene = () => sceneMode==='auto' ? (isOutsideActivity(currentSchedule().label)?'yard':'classroom') : sceneMode;
  const activityLabel = () => currentSchedule().label;
  const placeToSeat = (a) => ({x:250+(a.seat%4)*165, y:245+Math.floor(a.seat/4)*95+5});

  function addLog(message, time=simTime) {
    const log=$('activityLog');
    const node=document.createElement('div'); node.className='log-entry';
    const t=document.createElement('span'); t.className='log-time'; t.textContent=fmtTime(time);
    const m=document.createElement('span'); m.textContent=message;
    node.append(t,m); log.prepend(node);
    while(log.children.length>24) log.removeChild(log.lastChild);
  }
  function stateText(key, a) {
    const map={listen:'Đang nghe giảng',write:'Đang ghi chép bài',raise:'Đang giơ tay phát biểu',read:'Đang đọc sách',talk:'Đang nói chuyện',sleep:'Đang ngủ gật',play:'Đang chơi ở sân',wander:'Đang đi dạo',follow:'Đi theo cô giáo',home:'Đang ra về',teach:'Đang giảng bài',help:'Đang giúp học sinh',check:'Đang kiểm tra bài',walk:'Đang quan sát lớp',break:'Đang nghỉ ở sân',arrive:'Đang vào trường',eat:'Đang ăn trưa',social:'Đang sinh hoạt lớp',free:'Đang tự do'};
    return map[key] || a.state || 'Đang hoạt động';
  }
  function resolveStudentAction(a, label) {
    const override=a.behaviorOverride;
    if (override && override!=='auto') {
      if (override==='play' || override==='wander' || override==='home' || override==='follow') return override;
      if (['listen','write','raise','read','talk','sleep'].includes(override)) return override;
    }
    if (label==='Vào trường') return Math.random()<.55?'wander':'talk';
    if (label==='Ra về') return 'home';
    if (label==='Ra chơi') return a.personality==='quiet' && Math.random()<.5 ? 'wander' : (Math.random()<.72?'play':'talk');
    if (label==='Ăn trưa') return Math.random()<.65?'talk':'wander';
    if (label==='Sinh hoạt lớp') return a.focus>60?'listen':(Math.random()<.5?'talk':'write');
    if (label==='Hoạt động tự do') return pick(['read','talk','wander','play']);
    const diligence={diligent:.78,curious:.52,active:.35,playful:.25,quiet:.7,sleepy:.3,leader:.65}[a.personality] ?? .5;
    const focused=clamp((a.focus/100)*.66 + diligence*.34,0,1);
    const r=Math.random();
    if (r < focused*.42) return 'listen';
    if (r < focused*.72) return 'write';
    if (a.personality==='curious' && r<.85) return 'raise';
    if (a.personality==='sleepy' && r>.66) return 'sleep';
    if (a.personality==='playful' || a.personality==='active') return r<.75?'talk':'read';
    return r<.72?'read':'raise';
  }
  function targetForStudent(a, action, outdoor) {
    if (action==='home') return {x:970,y:572};
    if (outdoor) {
      if(action==='follow') return {x:clamp(teacher.x+rand(-35,35),80,920),y:clamp(teacher.y+rand(35,85),100,520)};
      if(action==='talk') {
        const friend=students.find(s=>s.id!==a.id && s.visible && s.stateKey==='talk' && Math.random()<.4);
        if(friend) return {x:friend.x+rand(-13,13),y:friend.y+rand(-13,13)};
      }
      if(action==='play') return {x:rand(110,880),y:rand(180,525)};
      return {x:rand(90,920),y:rand(120,535)};
    }
    const seat=placeToSeat(a);
    if(action==='follow') return {x:clamp(teacher.x+rand(-55,55),420,590),y:teacher.y+rand(32,65)};
    if(action==='talk') return {x:seat.x+rand(-10,10),y:seat.y+rand(-5,5)};
    return {x:seat.x+rand(-3,3),y:seat.y+rand(-3,3)};
  }
  function teacherActionFor(label) {
    if(teacher.behaviorOverride!=='auto') return teacher.behaviorOverride;
    if(label==='Ra chơi'||label==='Ăn trưa'||label==='Vào trường') return teacherStyle==='strict'?'walk':'break';
    if(label==='Ra về') return 'walk';
    if(label==='Sinh hoạt lớp') return 'check';
    if(teacherStyle==='fun' && Math.random()<.35) return 'help';
    if(teacherStyle==='gentle' && Math.random()<.25) return 'help';
    return pick(['teach','teach','check','help']);
  }
  function targetForTeacher(action, outdoor) {
    if(outdoor) {
      if(action==='break') return {x:500,y:130};
      if(action==='help') return {x:rand(250,750),y:rand(180,420)};
      return {x:500,y:150};
    }
    if(action==='help') { const s=pick(students); return {x:s.x+rand(-24,24),y:s.y-24}; }
    if(action==='check') return {x:rand(290,710),y:rand(170,210)};
    if(action==='walk') return {x:rand(300,700),y:rand(150,220)};
    return {x:500,y:140};
  }
  function setAction(a, action, target, force=false) {
    const changed=a.stateKey!==action;
    a.stateKey=action; a.state=stateText(action,a);
    if(target && (force || changed || Math.hypot(a.tx-target.x,a.ty-target.y)>55)) { a.tx=target.x; a.ty=target.y; }
    a.moving=Math.hypot(a.x-a.tx,a.y-a.ty)>4;
  }
  function updateActions(force=false) {
    const label=activityLabel(), outside=activeScene()==='yard';
    const tAction=teacherActionFor(label);
    setAction(teacher,tAction,targetForTeacher(tAction,outside),force);
    for(const a of students) {
      if(!a.visible && a.behaviorOverride!=='home' && label!=='Ra về') a.visible=true;
      const action=resolveStudentAction(a,label);
      if(action==='home') { if(a.visible) setAction(a,'home',targetForStudent(a,'home',true),force); }
      else {
        if(!a.visible) continue;
        const target=targetForStudent(a,action,outside);
        setAction(a,action,target,force);
      }
    }
    const key=`${label}-${Math.floor(simTime/60)}`;
    if(force || label!==lastPeriodKey) {
      const announcement={ 'Vào trường':'🔔 Học sinh bắt đầu đến trường.','Học bài':'📚 Đến giờ học, cô giáo bắt đầu hướng dẫn bài mới.','Ra chơi':'⚽ Đến giờ ra chơi, các bạn ra sân vận động.','Ăn trưa':'🍱 Đến giờ ăn trưa và nghỉ ngơi.','Sinh hoạt lớp':'🗣️ Cả lớp cùng sinh hoạt cuối buổi.','Ra về':'🎒 Tan học! Học sinh thu dọn đồ dùng và ra cổng.','Hoạt động tự do':'🌈 Các bạn được tự chọn hoạt động.'};
      if(announcement[label]) addLog(announcement[label]);
      lastPeriodKey=label;
    }
  }
  function resizeCanvas() {
    const rect=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr);
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  }
  function roundRect(x,y,w,h,r,fill,stroke=null,lw=1) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}
  }
  function drawClassroom() {
    ctx.fillStyle='#e7edf4'; ctx.fillRect(0,0,W,H);
    roundRect(22,20,956,580,12,'#d5dce8','#aeb9ca',3);
    ctx.save(); ctx.beginPath(); ctx.roundRect(30,30,940,560,5); ctx.clip();
    ctx.fillStyle='#f4e7d3'; ctx.fillRect(30,30,940,560);
    for(let x=34;x<970;x+=58){ctx.strokeStyle='rgba(166,135,94,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,34);ctx.lineTo(x,590);ctx.stroke();}
    for(let y=42;y<590;y+=48){ctx.strokeStyle='rgba(166,135,94,.16)';ctx.beginPath();ctx.moveTo(32,y);ctx.lineTo(968,y);ctx.stroke();}
    // top wall and board
    ctx.fillStyle='#d2d8e4';ctx.fillRect(30,30,940,19);
    roundRect(330,39,340,35,5,'#2d6155','#1d4e43',2);
    ctx.fillStyle='#eef8d7';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('CHĂM NGOAN • HỌC TỐT',500,61);
    ctx.strokeStyle='#a7b5c9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(360,78);ctx.lineTo(640,78);ctx.stroke();
    // windows on left, cabinets and door
    for(let y=95;y<410;y+=105){roundRect(31,y,22,73,3,'#bfe3f5','#8aa9bb',2);ctx.strokeStyle='#8aa9bb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(42,y+3);ctx.lineTo(42,y+70);ctx.moveTo(33,y+36);ctx.lineTo(51,y+36);ctx.stroke();}
    roundRect(900,37,61,19,4,'#d5b18a','#a88763',1);ctx.fillStyle='#76593e';ctx.font='9px sans-serif';ctx.fillText('CỬA',930,50);
    // teacher desk
    roundRect(428,91,144,39,5,'#c18b58','#96683f',2);roundRect(440,96,122,28,3,'#e1b27b');roundRect(475,96,35,18,2,'#f9f0db','#c6b89f',1);ctx.fillStyle='#df6c63';ctx.beginPath();ctx.arc(535,107,5,0,Math.PI*2);ctx.fill();
    // student desks; actors are layered above desks
    for(let row=0;row<4;row++) for(let col=0;col<4;col++){
      const x=212+col*165, y=198+row*95;
      roundRect(x-43,y-20,86,45,4,'#b5d8cf','#81b5a9',1.5);
      roundRect(x-39,y-16,78,36,3,'#d0e8df','#a0cfc1',1);
      ctx.fillStyle='#fffdf8';roundRect(x-23,y-10,30,24,2,'#fffdf3','#c7d2cc',1);
      ctx.strokeStyle='#88a6c6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-19,y-3);ctx.lineTo(x+2,y-3);ctx.moveTo(x-19,y+2);ctx.lineTo(x+1,y+2);ctx.stroke();
      roundRect(x+13,y-10,14,11,2,'#f4ce6c','#dab44c',1);
      roundRect(x-23,y+26,46,12,4,'#9bb4d8','#718bb5',1);
    }
    // school supplies and wall decoration
    roundRect(68,487,102,76,5,'#d6bc99','#af9673',2);ctx.fillStyle='#7a6750';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('TỦ SÁCH',119,526);
    roundRect(800,500,95,66,5,'#b5d9e7','#85b7cb',2);ctx.fillStyle='#527c8e';ctx.fillText('GÓC HỌC TẬP',847,535);
    ctx.restore();
  }
  function drawYard() {
    ctx.fillStyle='#d9e8f4';ctx.fillRect(0,0,W,H);
    // campus building top
    roundRect(30,24,940,115,10,'#d7dbe6','#b8c4d4',3);ctx.fillStyle='#9cacc1';ctx.fillRect(30,24,940,15);
    for(let x=70;x<930;x+=125){roundRect(x,55,67,52,4,'#c3e6f5','#93b9ce',2);ctx.strokeStyle='#93b9ce';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+33,56);ctx.lineTo(x+33,106);ctx.moveTo(x+3,81);ctx.lineTo(x+64,81);ctx.stroke();}
    ctx.fillStyle='#4f6882';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('TRƯỜNG TIỂU HỌC • SÂN TRƯỜNG',500,126);
    ctx.fillStyle='#82c98b';ctx.fillRect(30,145,940,445);
    // lawn patches
    for(let i=0;i<80;i++){const x=(i*137)%925+38,y=(i*83)%430+153;ctx.fillStyle=i%2?'rgba(56,156,91,.08)':'rgba(255,255,255,.10)';ctx.beginPath();ctx.ellipse(x,y,rand(7,22),rand(3,10),0,0,Math.PI*2);ctx.fill();}
    // walkways
    ctx.fillStyle='#e5d8bb';ctx.beginPath();ctx.moveTo(350,145);ctx.lineTo(650,145);ctx.lineTo(710,590);ctx.lineTo(300,590);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f1e6d0';for(let y=175;y<590;y+=45){ctx.fillRect(470,y,58,2);}
    // sport court
    roundRect(75,205,235,178,8,'#efb98c','#f8e3c9',3);ctx.strokeStyle='#fff2db';ctx.lineWidth=2;ctx.strokeRect(87,217,211,154);ctx.beginPath();ctx.ellipse(192,294,29,29,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(192,218);ctx.lineTo(192,370);ctx.stroke();
    // benches
    for(const [x,y] of [[720,220],[800,360],[115,460]]){roundRect(x,y,83,13,4,'#aa7448','#805638',2);roundRect(x+5,y+13,7,10,2,'#805638');roundRect(x+70,y+13,7,10,2,'#805638');}
    // trees
    for(const [x,y,r] of [[88,169,25],[342,177,19],[915,174,27],[903,450,29],[55,553,23],[880,560,21]]){ctx.fillStyle='#8b6748';ctx.fillRect(x-4,y+1,8,23);ctx.fillStyle='#3c9e67';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#64bd7c';ctx.beginPath();ctx.arc(x-6,y-6,r*.68,0,Math.PI*2);ctx.fill();}
    // gate
    ctx.fillStyle='#879ab1';ctx.fillRect(860,579,115,8);ctx.strokeStyle='#5f748e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(860,583);ctx.lineTo(860,548);ctx.lineTo(975,548);ctx.lineTo(975,583);ctx.stroke();ctx.fillStyle='#52657d';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('CỔNG TRƯỜNG',918,540);
  }
  function drawPerson(a) {
    if(!a.visible) return;
    const x=a.x,y=a.y, t=performance.now()/180 + a.phase;
    const moving=Math.hypot(a.x-a.tx,a.y-a.ty)>4;
    const walking=moving ? Math.sin(t)*3 : 0;
    const selected=a.id===selectedId;
    ctx.save();ctx.translate(x,y);
    if(selected){ctx.strokeStyle='rgba(83,102,245,.65)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,4,20,26,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(91,110,245,.08)';ctx.fill();}
    // soft shadow
    ctx.fillStyle='rgba(44,58,72,.18)';ctx.beginPath();ctx.ellipse(0,13,13,6,0,0,Math.PI*2);ctx.fill();
    // legs, with walking motion
    const legColor=a.type==='teacher'?'#48516b':(a.isGirl?'#263e75':'#324d7c');
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle=legColor;ctx.lineWidth=a.type==='teacher'?5.5:4.5;
    ctx.beginPath();ctx.moveTo(-4,3);ctx.lineTo(-5+walking,13);ctx.moveTo(4,3);ctx.lineTo(5-walking,13);ctx.stroke();
    // shoes
    ctx.strokeStyle='#f7f8fc';ctx.lineWidth=3.3;ctx.beginPath();ctx.moveTo(-7+walking,14);ctx.lineTo(-3+walking,14);ctx.moveTo(3-walking,14);ctx.lineTo(7-walking,14);ctx.stroke();
    if(a.type==='teacher'){
      // teacher arms and outfit
      ctx.strokeStyle=a.skin;ctx.lineWidth=5.5;ctx.beginPath();ctx.moveTo(-5,-7);ctx.lineTo(-11,1+walking);ctx.moveTo(5,-7);ctx.lineTo(11,-1-walking);ctx.stroke();
      ctx.fillStyle='#f0a14d';ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(8,-12);ctx.lineTo(7,5);ctx.lineTo(0,9);ctx.lineTo(-7,5);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff3d4';ctx.beginPath();ctx.moveTo(-3,-10);ctx.lineTo(3,-10);ctx.lineTo(0,-3);ctx.closePath();ctx.fill();
    } else {
      // arms, torso and school uniform
      ctx.strokeStyle=a.skin;ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(-5,-7);ctx.lineTo(-10,0+walking);ctx.moveTo(5,-7);ctx.lineTo(10,0-walking);ctx.stroke();
      ctx.fillStyle=a.color;ctx.beginPath();ctx.moveTo(-7,-12);ctx.lineTo(7,-12);ctx.lineTo(8,4);ctx.lineTo(-8,4);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f3f6ff';ctx.beginPath();ctx.moveTo(-3,-12);ctx.lineTo(3,-12);ctx.lineTo(0,-5);ctx.closePath();ctx.fill();
      if(a.isGirl){ctx.fillStyle='#526ba7';ctx.beginPath();ctx.moveTo(-7,2);ctx.lineTo(7,2);ctx.lineTo(9,8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();}
      // pose-specific arm gestures
      if(a.stateKey==='raise'){ctx.strokeStyle=a.skin;ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(6,-8);ctx.lineTo(8,-18);ctx.lineTo(8,-25);ctx.stroke();}
      if(a.stateKey==='write'){ctx.strokeStyle=a.skin;ctx.beginPath();ctx.moveTo(5,-7);ctx.lineTo(3,-1);ctx.stroke();ctx.strokeStyle='#f4d16d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(3,-1);ctx.lineTo(7,2);ctx.stroke();}
      if(a.stateKey==='play'){ctx.strokeStyle=a.skin;ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(-5,-7);ctx.lineTo(-12,-14+walking);ctx.moveTo(5,-7);ctx.lineTo(12,-14-walking);ctx.stroke();}
    }
    // head/face looking toward top of screen
    const headY=a.stateKey==='sleep'? -14:-15;
    ctx.fillStyle=a.skin;ctx.beginPath();ctx.arc(0,headY,7.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=a.hair;ctx.beginPath();ctx.arc(0,headY-2,7.4,Math.PI,Math.PI*2);ctx.lineTo(6.8,headY+1);ctx.quadraticCurveTo(3,headY-1,0,headY+0.5);ctx.quadraticCurveTo(-4,headY+2,-6.7,headY+1);ctx.closePath();ctx.fill();
    ctx.fillStyle='#352b28';ctx.beginPath();ctx.arc(-2.4,headY-.5,0.65,0,Math.PI*2);ctx.arc(2.4,headY-.5,0.65,0,Math.PI*2);ctx.fill();
    if(a.type==='teacher'){ctx.fillStyle='#e2ba65';ctx.beginPath();ctx.arc(5,headY-5,2,0,Math.PI*2);ctx.fill();}
    if(a.stateKey==='raise'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(15,-22,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5165e8';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText('?',15,-19);}
    if(a.stateKey==='sleep'){ctx.fillStyle='#66718e';ctx.font='bold 9px sans-serif';ctx.fillText('z',9,-23);ctx.fillText('z',14,-29);}
    ctx.restore();
    // name tag and selected outline
    ctx.save();ctx.textAlign='center';ctx.font=`${selected?'bold ':''}${a.type==='teacher'?10:9}px sans-serif`;
    const tag=a.type==='teacher'?'Cô Mai':a.name.split(' ').slice(-1)[0]; const tw=ctx.measureText(tag).width+10;
    roundRect(x-tw/2,y+17,tw,15,5,selected?'#596bf1':(a.type==='teacher'?'#fff0d9':'rgba(255,255,255,.88)'),selected?'#4a5be4':'rgba(89,108,140,.18)',1);
    ctx.fillStyle=selected?'#fff':(a.type==='teacher'?'#996326':'#45536f');ctx.fillText(tag,x,y+27.5);
    ctx.restore();
  }
  function drawScene() {
    ctx.clearRect(0,0,W,H);
    if(activeScene()==='yard') drawYard(); else drawClassroom();
    const visibleActors=actors.filter(a=>a.visible).slice().sort((a,b)=>a.y-b.y);
    for(const a of visibleActors) drawPerson(a);
    // little ambient visual cues
    if(activeScene()==='classroom' && (periodIs('Học bài')||periodIs('Sinh hoạt lớp'))){
      ctx.save();ctx.textAlign='center';ctx.font='bold 10px sans-serif';ctx.fillStyle='#527565';ctx.fillText(teacher.stateKey==='teach'?'CÔ ĐANG GIẢNG BÀI':teacher.stateKey==='help'?'CÔ ĐANG HƯỚNG DẪN':'LỚP HỌC 5A',500,87);ctx.restore();
    }
  }
  function updatePositions(dt) {
    for(const a of actors){
      if(!a.visible) continue;
      const dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy);
      if(d>1){const step=Math.min(d,dt*(a.type==='teacher'?34:28));a.x+=(dx/d)*step;a.y+=(dy/d)*step;a.moving=true;}else {a.moving=false;}
      if(a.stateKey==='home' && d<9){a.visible=false;if(a.type==='student') addLog(`🎒 ${a.name} đã ra cổng trường.`);}
    }
  }
  function renderStats() {
    $('clock').textContent=fmtTime(simTime);
    const label=activityLabel();$('activityStat').textContent=label;
    $('studentCount').textContent=students.filter(s=>s.visible).length;
    const visible=students.filter(s=>s.visible);const moods={diligent:0,curious:0,active:0,playful:0,quiet:0,sleepy:0,leader:0};visible.forEach(s=>moods[s.personality]++);
    let mood='Vui vẻ'; if(label==='Học bài') mood=visible.filter(s=>['listen','write','read'].includes(s.stateKey)).length>visible.length*.6?'Tập trung':'Sôi nổi'; else if(isOutsideActivity(label))mood='Năng động';
    $('moodStat').textContent=mood;
    $('currentPeriod').textContent=label;
    $('sceneTitle').textContent=activeScene()==='yard'?'Sân trường 5A':'Lớp học 5A';
    const desc={ 'Vào trường':'Học sinh đến trường và chuẩn bị vào lớp.','Học bài':'Cô giáo hướng dẫn bài, mỗi học sinh hành động theo tính cách.','Ra chơi':'Các bạn đang ra sân chơi, đi dạo hoặc trò chuyện.','Ăn trưa':'Cả trường nghỉ ngơi và ăn trưa.','Sinh hoạt lớp':'Cô giáo và học sinh tổng kết hoạt động trong ngày.','Ra về':'Học sinh thu dọn đồ dùng và lần lượt ra cổng.','Hoạt động tự do':'Mỗi học sinh tự chọn một hoạt động.'};
    $('sceneSubtitle').textContent=desc[label]||'Mô phỏng đang diễn ra.';
    document.querySelectorAll('.time-row').forEach(row=>row.classList.toggle('current',Number(row.dataset.time)<=simTime && Number(row.dataset.next)>simTime));
  }
  function renderTimetable() {
    const root=$('timetable');root.replaceChildren();
    schedule.forEach((e,i)=>{
      const row=document.createElement('div');row.className='time-row';row.dataset.time=e.time;row.dataset.next=schedule[i+1]?.time ?? 1440;
      const tm=document.createElement('span');tm.className='time-value';tm.textContent=fmtTime(e.time);
      const dot=document.createElement('span');dot.className='time-dot';
      const info=document.createElement('div');const title=document.createElement('div');title.className='time-title';title.textContent=e.label;const desc=document.createElement('div');desc.className='time-desc';desc.textContent=e.desc;info.append(title,desc);
      const tag=document.createElement('span');tag.className='time-tag';tag.textContent=e.tag||'Tùy chỉnh';row.append(tm,dot,info,tag);
      row.addEventListener('click',()=>{simTime=e.time;for(const a of students)a.visible=true;updateActions(true);renderStats();});root.append(row);
    });
  }
  function populateActorSelect(){
    const sel=$('actorSelect');sel.replaceChildren();
    const group1=document.createElement('optgroup');group1.label='Giáo viên';const opt=document.createElement('option');opt.value='teacher';opt.textContent='👩🏻‍🏫 Cô giáo Mai';group1.append(opt);sel.append(group1);
    const group2=document.createElement('optgroup');group2.label='Học sinh';
    students.forEach((a,i)=>{const o=document.createElement('option');o.value=a.id;o.textContent=`${String(i+1).padStart(2,'0')} · ${a.name}`;group2.append(o);});sel.append(group2);sel.value=selectedId;
  }
  function selected(){return actors.find(a=>a.id===selectedId)||students[0];}
  function loadActorForm(){
    const a=selected();
    const behaviorSelect=$('behaviorSelect');
    const studentOptions=[['auto','Tự quyết định theo thời khóa biểu'],['listen','Chú ý nghe giảng'],['write','Ghi chép bài'],['raise','Hay giơ tay phát biểu'],['read','Tự đọc sách'],['talk','Nói chuyện với bạn'],['sleep','Ngủ gật'],['play','Chơi với bạn'],['wander','Đi dạo quanh sân'],['follow','Đi theo cô giáo'],['home','Ra về']];
    const teacherOptions=[['auto','Tự động theo thời khóa biểu'],['teach','Giảng bài trên bảng'],['help','Đi giúp học sinh'],['check','Kiểm tra bài'],['walk','Đi quan sát lớp'],['break','Nghỉ ở sân trường']];
    const opts=a.type==='teacher'?teacherOptions:studentOptions;
    behaviorSelect.replaceChildren();
    opts.forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;behaviorSelect.append(option);});
    $('personalitySelect').value=a.personality;behaviorSelect.value=a.behaviorOverride;$('focusRange').value=a.focus;$('focusValue').textContent=`${a.focus}%`;
    $('actorSummary').innerHTML='';const avatar=document.createElement('div');avatar.className='actor-avatar';avatar.textContent=a.type==='teacher'?'👩🏻‍🏫':(a.isGirl?'👧🏻':'👦🏻');
    const meta=document.createElement('div');meta.className='actor-meta';const strong=document.createElement('strong');strong.textContent=a.name;const span=document.createElement('span');span.textContent=`${a.type==='teacher'?'Giáo viên':`Học sinh #${a.seat+1}`} · ${a.visible?stateText(a.stateKey,a):'Đã ra về'}`;meta.append(strong,span);$('actorSummary').append(avatar,meta);
    $('actorSummary').style.boxShadow=a.id===selectedId?'inset 3px 0 #6678f6':'none';
  }
  function applyActor(){
    const a=selected();a.personality=$('personalitySelect').value;a.behaviorOverride=$('behaviorSelect').value;a.focus=Number($('focusRange').value);
    if(a.type==='teacher') { $('teacherAction').value=a.behaviorOverride; }
    if(a.type==='student' && a.behaviorOverride==='home'){a.visible=true;}
    updateActions(true);loadActorForm();addLog(`⚙️ Đã cập nhật tính cách của ${a.name}: ${personalityNames[a.personality]}.`);
  }
  function addScheduleEvent(){
    const val=$('eventTime').value;const label=$('eventActivity').value;if(!val)return;
    const parts=val.split(':').map(Number);const time=parts[0]*60+parts[1];
    if(time<420||time>900){addLog('⚠️ Mốc thời gian nên nằm trong khoảng 07:00–15:00.');return;}
    const existing=schedule.findIndex(e=>e.time===time);const item={time,label,desc:({ 'Học bài':'Cô và học sinh theo hoạt động đã chọn.','Ra chơi':'Ra sân vận động và trò chuyện.','Ăn trưa':'Nghỉ trưa và trò chuyện.','Sinh hoạt lớp':'Cả lớp cùng tổng kết.','Ra về':'Thu dọn đồ dùng và ra cổng.','Hoạt động tự do':'Mỗi nhân vật tự chọn hành động.'})[label]||'Hoạt động theo thời khóa biểu.',tag:'Tùy chỉnh'};
    if(existing>=0)schedule[existing]=item;else schedule.push(item);schedule.sort((a,b)=>a.time-b.time);renderTimetable();updateActions(true);renderStats();addLog(`🗓️ Đã đặt ${fmtTime(time)}: ${label}.`);
  }
  function newDay(){simTime=420;minuteAccumulator=0;for(const a of actors){a.visible=true;a.behaviorOverride=a.type==='teacher'?a.behaviorOverride:a.behaviorOverride;a.x=a.type==='teacher'?500:a.homeX;a.y=a.type==='teacher'?143:a.homeY;a.tx=a.x;a.ty=a.y;a.stateKey='';}lastPeriodKey='';updateActions(true);renderStats();addLog('🌞 Một ngày học mới bắt đầu!');}
  function loop(ts){if(!lastFrame)lastFrame=ts;const dt=Math.min((ts-lastFrame)/1000,.06);lastFrame=ts;
    if(running){simTime+=dt*speed*.5; if(simTime>=900){simTime=420;for(const a of students){a.visible=true;a.x=a.homeX;a.y=a.homeY;a.tx=a.x;a.ty=a.y;}lastPeriodKey='';addLog('🌅 Ngày mô phỏng quay lại từ đầu.');updateActions(true);}
      if(ts-lastAutoBehaviorCheck>3500){updateActions(false);lastAutoBehaviorCheck=ts;}
      updatePositions(dt*speed);
    }
    drawScene();renderStats();requestAnimationFrame(loop);
  }
  $('playBtn').addEventListener('click',()=>{running=!running;$('playBtn').textContent=running?'⏸ Tạm dừng':'▶ Tiếp tục';});
  document.querySelectorAll('.speed').forEach(b=>b.addEventListener('click',()=>{speed=Number(b.dataset.speed);document.querySelectorAll('.speed').forEach(n=>n.classList.toggle('active',n===b));}));
  $('newDayBtn').addEventListener('click',newDay);
  $('sceneMode').addEventListener('change',e=>{sceneMode=e.target.value;updateActions(true);renderStats();});
  $('actorSelect').addEventListener('change',e=>{selectedId=e.target.value;loadActorForm();drawScene();});
  $('focusRange').addEventListener('input',e=>$('focusValue').textContent=`${e.target.value}%`);
  $('applyActorBtn').addEventListener('click',applyActor);
  $('resetActorBtn').addEventListener('click',()=>{const a=selected();a.behaviorOverride='auto';a.personality=a.type==='teacher'?'leader':personalities[a.seat%personalities.length];a.focus=a.type==='teacher'?95:75;loadActorForm();updateActions(true);addLog(`↺ ${a.name} trở về chế độ tự động.`);});
  $('teacherStyle').addEventListener('change',e=>{teacherStyle=e.target.value;});
  $('teacherAction').addEventListener('change',e=>{teacher.behaviorOverride=e.target.value;if(selectedId==='teacher')loadActorForm();});
  $('applyTeacherBtn').addEventListener('click',()=>{teacherStyle=$('teacherStyle').value;teacher.behaviorOverride=$('teacherAction').value;updateActions(true);loadActorForm();addLog(`👩🏻‍🏫 Cô giáo đổi phong cách dạy: ${$('teacherStyle').selectedOptions[0].textContent}.`);});
  $('addEventBtn').addEventListener('click',addScheduleEvent);
  $('clearLogBtn').addEventListener('click',()=>$('activityLog').replaceChildren());
  canvas.addEventListener('click',ev=>{
    const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)/rect.width*W,y=(ev.clientY-rect.top)/rect.height*H;
    let closest=null,dist=Infinity;for(const a of actors){if(!a.visible)continue;const d=Math.hypot(a.x-x,a.y-y);if(d<dist){dist=d;closest=a;}}
    if(closest&&dist<45){selectedId=closest.id;$('actorSelect').value=selectedId;loadActorForm();drawScene();}
  });
  window.addEventListener('resize',resizeCanvas);
  populateActorSelect();renderTimetable();resizeCanvas();loadActorForm();updateActions(true);renderStats();addLog('🏫 Lớp 5A đã mở cửa. Bạn có thể nhấn vào nhân vật để chỉnh riêng.');requestAnimationFrame(loop);
})();

