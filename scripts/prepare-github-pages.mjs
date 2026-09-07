import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve(process.cwd(), ".output", "public");
const assetsDir = path.resolve(publicDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error("Assets directory not found at", assetsDir);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"));
const clientJs = files.find((f) => f.startsWith("client-") && f.endsWith(".js"));
const indexJs = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));

console.log("Found CSS:", cssFile);
console.log("Found Client JS:", clientJs);
console.log("Found Index JS:", indexJs);

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Finantria Invest — Gestão de Investimentos</title>
    <meta name="description" content="Controle sua carteira de renda fixa e variável: aportes, proventos, IR estimado e rebalanceamento." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" />
    <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    ${cssFile ? `<link rel="stylesheet" href="/assets/${cssFile}" />` : ""}
    <script>
      // Single Page Apps for GitHub Pages routing fix
      (function(l) {
        if (l.search[1] === '/' ) {
          var decoded = l.search.slice(1).split('&').map(function(s) { 
            return s.replace(/~and~/g, '&')
          }).join('?');
          window.history.replaceState(null, null,
              l.pathname.slice(0, -1) + decoded + l.hash
          );
        }
      }(window.location))
    </script>
  </head>
  <body>
    <div id="root"></div>
    ${indexJs ? `<script type="module" src="/assets/${indexJs}"></script>` : ""}
    ${clientJs ? `<script type="module" src="/assets/${clientJs}"></script>` : ""}
  </body>
</html>
`;

// 404 SPA Redirect Script for GitHub Pages
const notFoundContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Finantria Invest</title>
    <script type="text/javascript">
      var pathSegmentsToKeep = 0;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
  </body>
</html>
`;

// Write index.html
fs.writeFileSync(path.join(publicDir, "index.html"), htmlContent);
console.log("Created .output/public/index.html");

// Write 404.html
fs.writeFileSync(path.join(publicDir, "404.html"), notFoundContent);
console.log("Created .output/public/404.html");

// Write .nojekyll (CRITICAL FOR GITHUB PAGES)
fs.writeFileSync(path.join(publicDir, ".nojekyll"), "");
console.log("Created .output/public/.nojekyll");

// Write CNAME
fs.writeFileSync(path.join(publicDir, "CNAME"), "login.gestaoinvestimentos.freedev.app\n");
console.log("Created .output/public/CNAME");
