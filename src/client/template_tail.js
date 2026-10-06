<script>
/* PWA：注册 Service Worker（满足 Android WebAPK 可安装性；iOS 用添加到主屏幕） */
if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function(){}); }); }
</script>
</body>
</html>`;
}
