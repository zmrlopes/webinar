// Service worker da PWA — só trata de push e do clique na notificação.
// Não faz cache de páginas de propósito: este site muda com frequência
// (leads, sessões, inscrições) e uma app offline "à séria" arriscava
// mostrar dados velhos; o ganho aqui é só o ícone no ecrã e as notificações.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

// Sem isto, alguns Chrome/Android mais antigos não consideram o site
// "instalável" e nunca oferecem o botão de instalação — mesmo sem cache
// nenhuma, um handler de fetch (que só deixa o pedido seguir normalmente)
// já satisfaz o critério.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (evento) => {
  let dados = { titulo: "Viajar é Viver", corpo: "", url: "/consultor" };
  try {
    if (evento.data) dados = { ...dados, ...evento.data.json() };
  } catch {
    // payload sem JSON válido — fica com o texto por omissão
  }

  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: dados.url },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = evento.notification.data?.url ?? "/consultor";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.includes(url) && "focus" in janela) return janela.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
