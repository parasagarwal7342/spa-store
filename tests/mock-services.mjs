// Local stand-ins for the Meta Graph API and the Anthropic API, used only by tests.
// Records every call to calls.json so the test can check what the site sent.
import http from 'node:http';
import { writeFileSync } from 'node:fs';

const calls = [];
const out = process.argv[2] || 'calls.json';
let n = 0;

const reply = (res, body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body });
    writeFileSync(out, JSON.stringify(calls, null, 1));

    if (url.pathname === '/v1/messages') {
      const msg = JSON.parse(body);
      const sys = JSON.stringify(msg.system);
      const user = JSON.stringify(msg.messages);
      let output;
      if (sys.includes('reply to comments')) {
        output = /refund|broken|worst/i.test(user)
          ? { category: 'complaint', needs_human: true, reply: '' }
          : /buy cheap followers/i.test(user)
            ? { category: 'spam', needs_human: false, reply: '' }
            : { category: 'question', needs_human: false, reply: 'Hi Riya! Yes, it’s in stock at ₹2,029 – you can order here: https://spaenterprise.in/p/x 😊' };
      } else {
        output = { caption: 'Festive season is here! Grab 15% off with code DIWALI15.\nOriginal National Geographic bags, shipped from Delhi.', hashtags: ['#NationalGeographic', '#DiwaliSale', 'SPAEnterprise'], headline: 'Diwali Sale 15% Off' };
      }
      return reply(res, { id: `msg_${++n}`, type: 'message', role: 'assistant', model: msg.model, content: [{ type: 'text', text: JSON.stringify(output) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } });
    }
    const p = url.pathname;
    if (p.endsWith('/photos')) return reply(res, { id: `photo_${++n}`, post_id: `page_post_${n}` });
    if (p.endsWith('/media_publish')) return reply(res, { id: `ig_media_${++n}` });
    if (p.endsWith('/media')) return reply(res, { id: `container_${++n}` });
    if (req.method === 'GET' && url.searchParams.get('fields') === 'status_code') return reply(res, { status_code: 'FINISHED' });
    if (p.endsWith('/comments') || p.endsWith('/replies')) return reply(res, { id: `reply_${++n}` });
    reply(res, { error: { message: `mock: unknown ${req.method} ${p}` } }, 400);
  });
}).listen(Number(process.argv[3] || 4010), () => console.log('mock services ready'));
