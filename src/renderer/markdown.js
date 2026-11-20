// Kleiner, sicherer Markdown-Renderer für Patch Notes (Überschriften, Listen, fett, kursiv, Code, Links).
(function () {
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function inline(text) {
    return esc(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="#" data-href="$2">$1</a>');
  }

  window.renderMarkdown = function (md) {
    const out = [];
    let para = [];
    let list = null;
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null; } };

    for (const raw of String(md || '').replace(/\r/g, '').split('\n')) {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); flushList(); }
      else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        flushPara(); flushList();
        const level = Math.min(m[1].length + 2, 5);
        out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      } else if ((m = line.match(/^[-*+]\s+(.*)$/))) {
        flushPara();
        (list ??= []).push(m[1]);
      } else {
        flushList();
        para.push(line);
      }
    }
    flushPara(); flushList();
    return out.join('');
  };
})();
