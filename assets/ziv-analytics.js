(function(){
 var ENDPOINT='https://crm.ziv.mx/api/events',SITE='zivcreativo.shop',key='ziv_session_id',sessionId=sessionStorage.getItem(key),engaged=false,started=new WeakSet(),params=new URLSearchParams(location.search);
 if(!sessionId){sessionId=crypto.randomUUID().replace(/-/g,'');sessionStorage.setItem(key,sessionId)}
 function referrer(){try{return document.referrer?new URL(document.referrer).hostname:null}catch(e){return null}}
 function send(event,label){fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site:SITE,event:event,sessionId:sessionId,path:location.pathname,label:label?String(label).trim().slice(0,120):null,referrerHost:referrer(),utmSource:params.get('utm_source'),utmMedium:params.get('utm_medium'),utmCampaign:params.get('utm_campaign')}),keepalive:true,mode:'cors'}).catch(function(){})}
 function markEngaged(){if(!engaged){engaged=true;send('engaged')}}
 send('page_view');setTimeout(markEngaged,10000);
 document.addEventListener('input',function(e){markEngaged();var form=e.target.closest('form');if(form&&!started.has(form)){started.add(form);send('form_start',form.id||'Formulario')}},true);
 document.addEventListener('change',function(e){var form=e.target.closest('form');if(form&&!started.has(form)){started.add(form);send('form_start',form.id||'Formulario')}},true);
 document.addEventListener('submit',function(e){send('form_submit',e.target.id||'Formulario')},true);
 document.addEventListener('click',function(e){var el=e.target.closest('a,button');if(!el)return;markEngaged();var href=el.href||'',label=el.dataset.event||el.getAttribute('aria-label')||el.textContent||'Acción';if(href.indexOf('wa.me/')>-1||href.indexOf('whatsapp')>-1)send('whatsapp_click',label);else if(el.classList.contains('button')||el.classList.contains('cta')||el.classList.contains('studio-button'))send('cta_click',label)},true);
 window.addEventListener('scroll',function(){if(scrollY>innerHeight*.35)markEngaged()},{passive:true});
})();
