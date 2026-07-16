const LIGHT_MODE_HEAD = `
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style type="text/css">
  :root { color-scheme: light only !important; supported-color-schemes: light !important; }
  html, body, .hellou-email-light {
    background-color: #ffffff !important;
    color: #211d25;
    color-scheme: light only !important;
  }
  @media (prefers-color-scheme: dark) {
    html, body, .hellou-email-light {
      background-color: #ffffff !important;
      color: #211d25 !important;
    }
  }
</style>`;

export function forceLightEmailHtml(html: string): string {
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${LIGHT_MODE_HEAD}`);
  }

  if (/<html(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<html(?:\s[^>]*)?>/i, (root) => `${root}<head>${LIGHT_MODE_HEAD}</head>`);
  }

  return `<!doctype html>
<html lang="pt-BR">
  <head>${LIGHT_MODE_HEAD}</head>
  <body class="hellou-email-light" style="margin:0;padding:0;background-color:#ffffff;color:#211d25;">
    <div class="hellou-email-light" style="background-color:#ffffff;color:#211d25;">${html}</div>
  </body>
</html>`;
}
