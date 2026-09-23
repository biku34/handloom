/**
 * Launch splash — shown only when SUTRA is opened as an installed app
 * (home-screen / desktop, i.e. display-mode: standalone). It paints the brand
 * mark, the SUTRA wordmark and a tagline over a maroon field, then fades out
 * once the page is ready. In a normal browser tab it is removed instantly, so
 * web visitors never see it.
 */
export default function SplashScreen() {
  return (
    <>
      <div id="sutra-splash" aria-hidden="true">
        <div className="sutra-splash__inner">
          <svg viewBox="0 0 64 64" className="sutra-splash__mark" aria-hidden="true">
            <rect width="64" height="64" rx="16" fill="#40101a" />
            <path
              d="M44.5 19.5C41 14 23 13 22.5 23.5 22 32.5 42 30.5 42 41.5 42 51.5 24 52 19.5 45"
              fill="none"
              stroke="#e5c383"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="44.5" cy="19.5" r="2" fill="#40101a" />
          </svg>
          <div className="sutra-splash__word">SUTRA</div>
          <div className="sutra-splash__tag">Every thread has a story</div>
        </div>
        <div className="sutra-splash__weave" />
      </div>
      <script
        // Runs immediately (before hydration): keep the splash only for the
        // installed app, otherwise strip it so the site loads straight to content.
        dangerouslySetInnerHTML={{
          __html: `(function(){var el=document.getElementById('sutra-splash');if(!el)return;var standalone=false;try{standalone=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||window.navigator.standalone===true;}catch(e){}if(!standalone){el.parentNode&&el.parentNode.removeChild(el);return;}el.classList.add('is-shown');var shownAt=Date.now();function hide(){el.classList.add('is-hiding');setTimeout(function(){el.parentNode&&el.parentNode.removeChild(el);},600);}function scheduleHide(){var wait=Math.max(0,1300-(Date.now()-shownAt));setTimeout(hide,wait);}if(document.readyState==='complete'){scheduleHide();}else{window.addEventListener('load',scheduleHide);}setTimeout(hide,3500);})();`,
        }}
      />
    </>
  );
}
