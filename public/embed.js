(function() {
    var container = document.createElement('div');
    container.id = 'ai-assistant-container';
    document.body.appendChild(container);
  
    var script = document.createElement('script');
    script.src = 'https://your-app-url.com/static/js/main.js';
    script.async = true;
    document.body.appendChild(script);
  
    var link = document.createElement('link');
    link.href = 'https://your-app-url.com/static/css/main.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  })();