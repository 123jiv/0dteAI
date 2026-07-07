"use client";

import JSZip from "jszip";
import type { Story } from "./types";
import { download, slugify, toParagraphs } from "./utils";

const titleOf = (story: Story) => story.settings.title || "Untitled Story";

export function exportMarkdown(story: Story): void {
  const title = titleOf(story);
  const md = [
    `# ${title}`,
    "",
    `> ${story.prompt}`,
    "",
    ...story.chapters.flatMap((c, i) => [`## Chapter ${i + 1}: ${c.title}`, "", c.content, ""]),
  ].join("\n");
  download(`${slugify(title)}.md`, md, "text/markdown");
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const chapterXhtml = (title: string, content: string) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(title)}</title><style>body{font-family:Georgia,serif;line-height:1.7;margin:5%}h2{font-weight:normal}</style></head>
<body><h2>${escapeXml(title)}</h2>${toParagraphs(content)
  .map((p) => `<p>${escapeXml(p)}</p>`)
  .join("\n")}</body>
</html>`;

export async function exportEpub(story: Story): Promise<void> {
  const title = titleOf(story);
  const id = `urn:uuid:${story.id}`;
  const zip = new JSZip();

  // mimetype must be the first entry, stored uncompressed
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`
  );

  const chapters = story.chapters.map((c, i) => ({
    file: `chapter${i + 1}.xhtml`,
    title: `Chapter ${i + 1}: ${c.title}`,
    content: c.content,
  }));
  for (const ch of chapters) {
    zip.file(`OEBPS/${ch.file}`, chapterXhtml(ch.title, ch.content));
  }

  const manifest = chapters
    .map((c, i) => `<item id="ch${i + 1}" href="${c.file}" media-type="application/xhtml+xml"/>`)
    .join("\n    ");
  const spine = chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join("\n    ");
  const navPoints = chapters
    .map(
      (c, i) =>
        `<navPoint id="np${i + 1}" playOrder="${i + 1}"><navLabel><text>${escapeXml(c.title)}</text></navLabel><content src="${c.file}"/></navPoint>`
    )
    .join("\n    ");

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>StoryForge</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">${id}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`
  );
  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${id}"/></head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`
  );

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
  download(`${slugify(title)}.epub`, blob, "application/epub+zip");
}

/** Opens a print-optimized window; the browser's print dialog saves it as PDF. */
export function exportPdf(story: Story): void {
  const title = titleOf(story);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeXml(title)}</title>
<style>
  body { font-family: Georgia, serif; color: #111; max-width: 42rem; margin: 2rem auto; line-height: 1.75; }
  h1 { font-size: 2rem; text-align: center; margin-bottom: 3rem; }
  h2 { font-size: 1.3rem; margin-top: 3rem; page-break-before: always; }
  h2:first-of-type { page-break-before: avoid; }
  p { margin: 0 0 1em; text-indent: 1.5em; }
</style></head>
<body>
<h1>${escapeXml(title)}</h1>
${story.chapters
  .map(
    (c, i) =>
      `<h2>Chapter ${i + 1}: ${escapeXml(c.title)}</h2>` +
      toParagraphs(c.content)
        .map((p) => `<p>${escapeXml(p)}</p>`)
        .join("")
  )
  .join("\n")}
<script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
