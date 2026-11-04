import { describe, expect, it } from "vitest";
import {
  DEFAULT_VENDOR_TEMPLATES,
  fillFields,
  findPlaceholders,
  renderBodyHtml,
  renderBodyText,
  renderLine,
} from "@/lib/vendorEmailTemplates";

const vars = {
  ownerName: "Ada",
  brandName: "Suya <Spot>",
  eventTitle: "Dine At Night 2026",
  eventDate: "17th December",
  venue: "Federal Palace",
};

describe("renderBodyHtml", () => {
  it("turns blank-line blocks into paragraphs, ## into headings and **x** into bold", () => {
    const html = renderBodyHtml("Hi {ownerName},\n\n## Stall Fee\n\nPay **₦180,000** by Friday.", vars);
    expect(html.match(/<p /g)).toHaveLength(3);
    expect(html).toContain(">Hi Ada,</p>");
    expect(html).toContain("text-transform:uppercase;\">Stall Fee</p>");
    expect(html).toContain('<strong style="color:#ccc;">₦180,000</strong>');
  });

  it("keeps a paragraph that follows a heading with no blank line", () => {
    const html = renderBodyHtml("## Next Steps\nReply by Friday.", vars);
    expect(html).toContain(">Next Steps</p>");
    expect(html).toContain(">Reply by Friday.</p>");
  });

  it("escapes HTML in both the template and the vendor's details", () => {
    const html = renderBodyHtml("<script>x</script> {brandName}", vars);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Suya &lt;Spot&gt;");
  });

  it("keeps single line breaks inside a paragraph", () => {
    expect(renderBodyHtml("Warm regards,\n**The Team**", vars)).toContain("Warm regards,<br/>");
  });
});

describe("fields", () => {
  it("fills known fields and leaves unknown ones as written", () => {
    expect(fillFields("{ownerName} at {venue} {notAField}", vars)).toBe("Ada at Federal Palace {notAField}");
  });

  it("renders subject lines without bold markers", () => {
    expect(renderLine("**{eventTitle}**: your application", vars)).toBe("Dine At Night 2026: your application");
  });

  it("renders a readable plain-text version", () => {
    expect(renderBodyText("## Next Steps\n\nPay **now**.", vars)).toBe("NEXT STEPS\n\nPay now.");
  });
});

describe("findPlaceholders", () => {
  it("finds [gaps] in any field", () => {
    expect(findPlaceholders({ subject: "Hi", preview: "[preview]", body: "Fee: [fee here]" })).toEqual([
      "[preview]",
      "[fee here]",
    ]);
  });

  it("the Standard default is complete; the Mini Market default is a draft", () => {
    expect(findPlaceholders(DEFAULT_VENDOR_TEMPLATES.standard)).toEqual([]);
    expect(findPlaceholders(DEFAULT_VENDOR_TEMPLATES.mini_market).length).toBeGreaterThan(0);
  });
});
