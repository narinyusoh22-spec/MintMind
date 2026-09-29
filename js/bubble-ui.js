(()=>{
  if(document.body.classList.contains('transactions-static-motion')||document.body.classList.contains('dashboard-static-motion')||document.querySelector('.bubble-scene'))return;
  const scene=document.createElement('div');scene.className='bubble-scene';scene.setAttribute('aria-hidden','true');
  for(let index=0;index<6;index++){const orb=document.createElement('span');orb.className='bubble-orb';scene.append(orb)}
  document.body.prepend(scene);
  if(matchMedia('(pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    let frame=0;
    window.addEventListener('pointermove',event=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{const x=(event.clientX/innerWidth-.5)*10,y=(event.clientY/innerHeight-.5)*10;scene.style.setProperty('--pointer-x',`${x}px`);scene.style.setProperty('--pointer-y',`${y}px`);scene.querySelectorAll('.bubble-orb').forEach((orb,index)=>{orb.style.marginLeft=`${x*(index%3+1)*.12}px`;orb.style.marginTop=`${y*(index%2+1)*.12}px`});frame=0})
    },{passive:true});
  }
})();
