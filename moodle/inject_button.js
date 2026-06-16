<script>
document.addEventListener("DOMContentLoaded", function() {
    fetch('/shutdown_gateway.php?check=1')
        .then(response => response.json())
        .then(data => {
            if (data && data.isAdmin) {
                // Tạo nút TẮT MÁY SEB
                var btn1 = document.createElement("a");
                btn1.href = "/shutdown_gateway.php";
                btn1.target = "_blank";
                btn1.innerHTML = "TẮT MÁY SEB";
                btn1.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:9999; background:#ff0000; color:#fff; padding:15px 25px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5); border: 2px solid white; transition: transform 0.2s;";
                btn1.onmouseover = function() { this.style.transform = "scale(1.05)"; };
                btn1.onmouseout = function() { this.style.transform = "scale(1)"; };
                document.body.appendChild(btn1);

                // Tạo nút USER IMPORT
                var btn2 = document.createElement("a");
                btn2.href = "/user_importer.php";
                btn2.target = "_blank";
                btn2.innerHTML = "USER IMPORT";
                btn2.style.cssText = "position:fixed; bottom:80px; right:20px; z-index:9999; background:#28a745; color:#fff; padding:15px 25px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5); border: 2px solid white; transition: transform 0.2s;";
                btn2.onmouseover = function() { this.style.transform = "scale(1.05)"; };
                btn2.onmouseout = function() { this.style.transform = "scale(1)"; };
                document.body.appendChild(btn2);
            }
        })
        .catch(err => console.error(err));
});
</script>
