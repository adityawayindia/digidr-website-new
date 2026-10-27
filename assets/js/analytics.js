/* DigiDr GA4 analytics.
   Set GA_ID to your GA4 Measurement ID (Admin > Data streams > Web).
   Never sends typed values (search terms excepted) — only field names, counts and timings. */
(()=>{
  const GA_ID='G-EJND0R16D5';
  const LINKED_DOMAINS=['digidr.app','web.digidr.app'];
  if(!/^G-[A-Z0-9]+$/.test(GA_ID)||GA_ID==='G-XXXXXXXXXX'){console.warn('[analytics] GA_ID not set');}

  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){dataLayer.push(arguments);};
  const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;document.head.appendChild(s);

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const pageType=
    /\/(index\.html)?$/.test(location.pathname)?'home':
    /\/products\//.test(path)?'product':
    /\/specialties\//.test(path)?'specialty':
    /\/research\//.test(path)?'research_article':
    (path.match(/\/([\w-]+)\.html$/)||[,'other'])[1];

  gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
  gtag('js',new Date());
  gtag('config',GA_ID,{
    linker:{domains:LINKED_DOMAINS},
    content_group:pageType,
    page_type:pageType
  });

  const send=(name,params={})=>gtag('event',name,Object.assign({page_type:pageType},params));
  const clean=t=>(t||'').replace(/\s+/g,' ').trim().slice(0,100);
  const sectionOf=el=>{const sec=el&&el.closest('section[id],[data-section],header,footer,nav');return sec?(sec.dataset.section||sec.id||sec.tagName.toLowerCase()):'none';};

  /* ---- Section views + time spent per section ---- */
  const seen=new Set(),visibleSince=new Map(),timeIn={};
  const sections=[...document.querySelectorAll('section[id],[data-section]')];
  if('IntersectionObserver' in window&&sections.length){
    const io=new IntersectionObserver(entries=>entries.forEach(en=>{
      const id=en.target.dataset.section||en.target.id;
      if(en.isIntersecting){
        visibleSince.set(id,performance.now());
        if(!seen.has(id)){seen.add(id);send('section_view',{section_id:id,section_index:sections.indexOf(en.target)+1});
          if(id==='pricing')send('view_pricing',{source:location.hash==='#pricing'?'direct_link':'scroll'});}
      }else if(visibleSince.has(id)){timeIn[id]=(timeIn[id]||0)+performance.now()-visibleSince.get(id);visibleSince.delete(id);}
    }),{threshold:0.4});
    sections.forEach(el=>io.observe(el));
  }

  /* ---- Scroll depth ---- */
  const marks=[25,50,75,90,100],hit=new Set();
  const onScroll=()=>{const h=document.documentElement,pct=(h.scrollTop+innerHeight)/h.scrollHeight*100;
    marks.forEach(m=>{if(pct>=m-1&&!hit.has(m)){hit.add(m);send('scroll_depth',{percent_scrolled:m});}});};
  addEventListener('scroll',()=>requestAnimationFrame(onScroll),{passive:true});

  /* ---- Clicks: CTAs, pricing, navigation, outbound, FAQ, modals ---- */
  document.addEventListener('click',e=>{
    const el=e.target.closest('a,button,summary,[role="button"],[data-track]');if(!el)return;
    const text=clean(el.getAttribute('aria-label')||el.textContent),section=sectionOf(el);
    const href=el.getAttribute('href')||'';
    const base={link_text:text,section_id:section,link_url:el.href||href};

    if(el.dataset.track)send(el.dataset.track,base);
    if(el.closest('#pricing,.doctor-pricing-section,[data-pricing]')){
      send('pricing_interaction',Object.assign({plan:clean((el.closest('[data-plan],article,li,.card')||el).querySelector?.('h3,h4,strong')?.textContent)||text},base));
    }
    if(el.matches('summary'))send('faq_toggle',{question:text,section_id:section,opened:!el.parentElement.open});
    if(el.dataset.modalTitle)send('modal_open',{modal_title:clean(el.dataset.modalTitle),section_id:section});
    if(/^mailto:/.test(href))send('contact_email',base);
    else if(/^tel:/.test(href))send('contact_phone',base);
    else if(/web\.digidr\.app/.test(href))send(/login/.test(href)?'sign_in_click':'registration_click',base);
    else if(/play\.google\.com/.test(href))send('app_store_click',Object.assign({store:'google_play'},base));
    else if(el.closest('nav,.site-header'))send('nav_click',base);
    else if(el.closest('.site-footer,footer'))send('footer_click',base);
    else if(el.tagName==='A'&&el.host&&el.host!==location.host)send('outbound_click',base);
    else send('cta_click',Object.assign({element:el.tagName.toLowerCase()},base));
  },true);

  /* ---- Search & filters (research, specialties) ---- */
  const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
  document.querySelectorAll('input[type="search"]').forEach(inp=>inp.addEventListener('input',debounce(()=>{
    const term=inp.value.trim();if(term.length>=2)send('search',{search_term:term.slice(0,60),search_location:inp.id||inp.dataset.specialtySearch||sectionOf(inp)});
  },1200)));
  document.querySelectorAll('select').forEach(sel=>sel.addEventListener('change',()=>send('filter_change',{filter_name:sel.id||sel.name,filter_value:sel.value})));
  document.querySelectorAll('input[type="range"]').forEach(r=>r.addEventListener('change',()=>send('slider_interaction',{section_id:sectionOf(r)}),{once:true}));

  /* ---- Forms: start, field progress, submit, abandon ---- */
  const forms=new Map();
  const fieldName=f=>f.name||f.id||f.getAttribute('aria-label')||f.type;
  const formName=f=>f.getAttribute('name')||f.id||f.dataset.formName||sectionOf(f);
  const stateFor=form=>{if(!forms.has(form))forms.set(form,{started:false,submitted:false,done:new Set(),last:'',t0:0});return forms.get(form);};
  document.addEventListener('focusin',e=>{
    const f=e.target;if(!f.form||!f.matches('input,textarea,select')||f.type==='search')return;
    const st=stateFor(f.form);st.last=fieldName(f);
    if(!st.started){st.started=true;st.t0=performance.now();send('form_start',{form_name:formName(f.form),first_field:st.last});}
  });
  document.addEventListener('change',e=>{
    const f=e.target;if(!f.form||f.type==='search')return;const st=stateFor(f.form),n=fieldName(f);
    if(f.value&&!st.done.has(n)){st.done.add(n);send('form_field_complete',{form_name:formName(f.form),field_name:n,fields_completed:st.done.size});}
  });
  document.addEventListener('submit',e=>{
    const form=e.target,st=stateFor(form);st.submitted=true;
    send('form_submit',{form_name:formName(form),fields_completed:st.done.size,seconds_to_submit:Math.round((performance.now()-st.t0)/1000)});
  },true);
  document.addEventListener('invalid',e=>{const f=e.target;if(f.form)send('form_error',{form_name:formName(f.form),field_name:fieldName(f)});},true);

  /* ---- On leave: abandoned forms + section dwell time ---- */
  let flushed=false;
  const flush=()=>{if(flushed)return;flushed=true;
    forms.forEach((st,form)=>{if(st.started&&!st.submitted){
      const total=[...form.elements].filter(f=>f.matches('input,textarea,select')&&!['hidden','submit','button'].includes(f.type)).length;
      send('form_abandon',{form_name:formName(form),last_field:st.last,fields_completed:st.done.size,fields_total:total,seconds_in_form:Math.round((performance.now()-st.t0)/1000),transport_type:'beacon'});}});
    visibleSince.forEach((t,id)=>{timeIn[id]=(timeIn[id]||0)+performance.now()-t;});
    Object.entries(timeIn).filter(([,ms])=>ms>2000).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .forEach(([id,ms])=>send('section_engagement',{section_id:id,seconds_visible:Math.round(ms/1000),transport_type:'beacon'}));
  };
  addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});

  window.digidrTrack=send;
})();
