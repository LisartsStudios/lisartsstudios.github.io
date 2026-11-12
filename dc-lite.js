/* dc-lite: runtime minimo para las paginas del portfolio Lisarts Studios */
(function () {
  var SVG = 'http://www.w3.org/2000/svg';
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, SOLO = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function look(path, sc) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    var parts = path.split('.'), v = sc[parts[0]];
    for (var i = 1; i < parts.length && v != null; i++) v = v[parts[i]];
    return v;
  }
  function str(v) { return v == null ? '' : String(v); }
  function sub(s, sc) { return s.replace(HOLE, function (_, p) { return str(look(p, sc)); }); }
  function truthy(v) { return !!v && v !== 'false' && v !== '0'; }

  var handlers;
  function kids(node, sc) { var o = ''; for (var c = node.firstChild; c; c = c.nextSibling) o += R(c, sc); return o; }
  function R(node, sc) {
    if (node.nodeType === 3) return esc(sub(node.nodeValue, sc)).replace(/&quot;/g, '"');
    if (node.nodeType !== 1) return '';
    var tag = node.namespaceURI === SVG ? node.tagName : node.localName;
    if (tag === 'sc-for') {
      var m = SOLO.exec(node.getAttribute('list') || ''), lst = m ? look(m[1], sc) : null, as = node.getAttribute('as') || 'item', o = '';
      if (lst && lst.length) for (var i = 0; i < lst.length; i++) { var s2 = Object.create(sc); s2[as] = lst[i]; o += kids(node, s2); }
      return o;
    }
    if (tag === 'sc-if') {
      var m2 = SOLO.exec(node.getAttribute('value') || '');
      return m2 && truthy(look(m2[1], sc)) ? kids(node, sc) : '';
    }
    var o2 = '<' + tag, ev = [];
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a], n = at.name, v = at.value;
      if (n.indexOf('hint-placeholder') === 0) continue;
      if (/^on[a-z]+$/i.test(n)) {
        var mm = SOLO.exec(v), fn = mm ? look(mm[1], sc) : null;
        if (typeof fn === 'function') { handlers.push(fn); ev.push(n.slice(2).toLowerCase() + ':' + (handlers.length - 1)); }
        continue;
      }
      o2 += ' ' + n + '="' + esc(sub(v, sc)) + '"';
    }
    if (ev.length) o2 += ' data-dcev="' + ev.join(',') + '"';
    o2 += '>';
    if (VOID[tag]) return o2;
    return o2 + kids(node, sc) + '</' + tag + '>';
  }

  var comp, root, tpl, pend = false;
  function render() {
    pend = false;
    var vals;
    try { vals = comp.renderVals() || {}; } catch (err) { console.error(err); return; }
    handlers = [];
    var html = kids(tpl, vals);
    var hs = handlers;
    morphdom(root, '<div id="dc-root">' + html + '</div>', {
      onBeforeElUpdated: function (from, to) { if (from.isEqualNode(to)) return false; return true; }
    });
    var els = root.querySelectorAll('[data-dcev]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.getAttribute('data-dcev').split(',').forEach(function (p) {
          var k = p.split(':'), fn = hs[+k[1]];
          el['on' + k[0]] = function (e) { try { return fn.call(comp, e); } catch (err) { console.error(err); } };
        });
      })(els[i]);
    }
  }
  function schedule() { if (pend) return; pend = true; Promise.resolve().then(render); }

  window.DCLogic = function DCLogic(props) { this.props = props || {}; this.state = {}; };
  window.DCLogic.prototype.setState = function (p) {
    if (typeof p === 'function') p = p(this.state || {});
    this.state = Object.assign({}, this.state || {}, p || {});
    schedule();
  };

  function boot() {
    tpl = document.getElementById('dc-tpl').content;
    root = document.getElementById('dc-root');
    var src = document.getElementById('dc-src'), props = {};
    try { var dp = JSON.parse(src.getAttribute('data-props') || '{}'); for (var k in dp) if (k[0] !== '$' && dp[k] && 'default' in dp[k]) props[k] = dp[k].default; } catch (e) {}
    var C = new Function('DCLogic', src.textContent + '\n;return Component;')(window.DCLogic);
    comp = new C(props);
    if (!comp.props) comp.props = props;
    if (!comp.state) comp.state = {};
    render();
    if (comp.componentDidMount) { try { comp.componentDidMount(); } catch (err) { console.error(err); } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
