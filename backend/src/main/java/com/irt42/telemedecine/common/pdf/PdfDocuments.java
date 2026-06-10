package com.irt42.telemedecine.common.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Tiny OpenPDF wrapper producing the project's standard one-page documents
 * (e-prescriptions, consultation reports): a brand-coloured header, a
 * key/value metadata table, a free-text body and a disclaimer footer.
 * Stateless — every call builds a fresh in-memory PDF.
 */
public final class PdfDocuments {

    private static final Color BRAND = new Color(0x3A, 0x56, 0xC1);
    private static final Color INK = new Color(0x1F, 0x29, 0x37);
    private static final Color MUTED = new Color(0x6B, 0x72, 0x80);
    private static final Color LIGHT = new Color(0xEE, 0xF1, 0xFF);

    private PdfDocuments() {}

    /** One metadata row of the document header table. */
    public record Meta(String label, String value) {}

    public static byte[] document(String heading, String subheading,
                                  List<Meta> meta, String bodyTitle, String body,
                                  String footer) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 48, 48, 56, 56);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font h1 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, BRAND);
            Font h2 = FontFactory.getFont(FontFactory.HELVETICA, 11, MUTED);
            Font label = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, MUTED);
            Font value = FontFactory.getFont(FontFactory.HELVETICA, 10, INK);
            Font bodyTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, INK);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11, INK);
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, MUTED);

            Paragraph title = new Paragraph(heading, h1);
            title.setSpacingAfter(2);
            doc.add(title);
            if (subheading != null && !subheading.isBlank()) {
                Paragraph sub = new Paragraph(subheading, h2);
                sub.setSpacingAfter(16);
                doc.add(sub);
            }

            if (meta != null && !meta.isEmpty()) {
                PdfPTable table = new PdfPTable(2);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1f, 2.4f});
                table.setSpacingAfter(18);
                for (Meta m : meta) {
                    PdfPCell k = new PdfPCell(new Phrase(m.label().toUpperCase(), label));
                    k.setBackgroundColor(LIGHT);
                    k.setBorderColor(Color.WHITE);
                    k.setPadding(7);
                    PdfPCell v = new PdfPCell(new Phrase(m.value() == null ? "—" : m.value(), value));
                    v.setBorderColor(LIGHT);
                    v.setPadding(7);
                    table.addCell(k);
                    table.addCell(v);
                }
                doc.add(table);
            }

            if (bodyTitle != null && !bodyTitle.isBlank()) {
                Paragraph bt = new Paragraph(bodyTitle, bodyTitleFont);
                bt.setSpacingAfter(6);
                doc.add(bt);
            }
            if (body != null && !body.isBlank()) {
                Paragraph b = new Paragraph(body, bodyFont);
                b.setLeading(16);
                b.setSpacingAfter(24);
                doc.add(b);
            }

            if (footer != null && !footer.isBlank()) {
                Paragraph f = new Paragraph(footer, footerFont);
                f.setAlignment(Element.ALIGN_CENTER);
                doc.add(f);
            }

            doc.close();
            return out.toByteArray();
        } catch (DocumentException | java.io.IOException e) {
            throw new IllegalStateException("PDF generation failed", e);
        }
    }
}
