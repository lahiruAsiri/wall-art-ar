/**
 * @author mrdoob / http://mrdoob.com
 * @author Mugen87 / https://github.com/Mugen87
 * @author NikLever / http://niklever.com
 */

class ARButton {
    static createButton(renderer, options) {
      const button = document.createElement('button');
  
      function showStartAR(/*device*/) {
        let currentSession = null;
  
        function onSessionStarted(session) {
          session.addEventListener('end', onSessionEnded);
          renderer.xr.setSession(session);
          button.textContent = 'STOP AR';
          currentSession = session;
        }
  
        function onSessionEnded(/*event*/) {
          currentSession.removeEventListener('end', onSessionEnded);
          button.textContent = 'START AR';
          currentSession = null;
        }
  
        button.style.display = '';
        button.style.cursor = 'pointer';
        button.style.left = 'calc(50% - 50px)';
        button.style.width = '100px';
        button.textContent = 'START AR';
        button.className = 'ar-button';
  
        button.onmouseenter = function () {
          button.style.opacity = '1.0';
        };
  
        button.onmouseleave = function () {
          button.style.opacity = '0.5';
        };
  
        button.onclick = function () {
          if (currentSession === null) {
            navigator.xr
              .requestSession('immersive-ar', options)
              .then(onSessionStarted);
          } else {
            currentSession.end();
          }
        };
  
        return button;
      }
  
      function disableButton() {
        button.style.display = 'none';
      }
  
      function showWebXRNotSupported() {
        disableButton();
        button.textContent = 'XR NOT SUPPORTED';
      }
  
      if ('xr' in navigator) {
        button.id = 'ARButton';
        button.style.display = 'none';
  
        navigator.xr
          .isSessionSupported('immersive-ar')
          .then(function (supported) {
            supported ? showStartAR() : showWebXRNotSupported();
          })
          .catch(showWebXRNotSupported);
  
        return button;
      } else {
        showWebXRNotSupported();
        return button;
      }
    }
  }
  
  export { ARButton };