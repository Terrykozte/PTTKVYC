const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/?showcase=true', { waitUntil: 'networkidle2' });

  const data = await page.evaluate(() => {
    const toFigma = (el, parentRect) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0 || style.display === 'none') return null;

      let name = el.getAttribute('data-name') || el.id;
      if (!name) {
        if (typeof el.className === 'string') {
          name = el.className.split(' ')[0];
        } else if (el.className && typeof el.className.baseVal === 'string') {
          name = el.className.baseVal;
        } else {
          name = el.tagName;
        }
      }

      const node = {
        name: name || el.tagName,
        type: 'FRAME',
        x: rect.left - (parentRect ? parentRect.left : 0),
        y: rect.top - (parentRect ? parentRect.top : 0),
        width: rect.width,
        height: rect.height,
        opacity: parseFloat(style.opacity),
        fills: style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? [{ type: 'SOLID', color: style.backgroundColor }] : [],
        cornerRadius: parseInt(style.borderRadius) || 0,
        children: []
      };

      // Add Prototype metadata hints
      if (el.tagName === 'BUTTON' || el.onclick || el.getAttribute('role') === 'button') {
        node.itemSpacing = 10; // Hint for figma
        node.name = 'BUTTON:' + node.name;
      }

      if (el.children.length === 0 && (el.innerText || '').trim()) {
        node.type = 'TEXT';
        node.characters = (el.innerText || '').trim();
        node.fontSize = parseInt(style.fontSize);
        node.fontName = style.fontFamily;
        node.color = style.color;
      } else {
        for (const child of el.children) {
          const childNode = toFigma(child, rect);
          if (childNode) node.children.push(childNode);
        }
      }
      return node;
    };

    return Array.from(document.querySelectorAll('.phone')).map(el => {
      const frame = toFigma(el, null);
      if (frame) {
        frame.name = el.closest('.showcase-item')?.querySelector('h3')?.innerText || frame.name;
      }
      return frame;
    });
  });

  fs.writeFileSync('locket_figma.json', JSON.stringify(data, null, 2));
  console.log('JSON extracted to locket_figma.json');
  await browser.close();
})();
