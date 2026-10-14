import { useState } from "react";
import { stamp, uid } from "../lib/domain";
import { announce, change, useApp } from "../lib/store";
import { Field, Form } from "./common";
import { Modal } from "./ui/dialog";

export function QuickNotes({ onClose }: { onClose: () => void }) {
  const notes = useApp((state) => state.data!.quickNotes);
  const [body, setBody] = useState("");
  return (
    <Modal
      title="Quick Note"
      description="Tangkap pikiran kecil. Tersimpan hanya di perangkat ini."
      onClose={onClose}
    >
      <Form
        saveLabel="Simpan catatan"
        onSave={async () => {
          if (!body.trim()) throw new Error("Tulis catatan terlebih dahulu.");
          const note = {
            id: uid(),
            body: body.trim(),
            createdAt: new Date().toISOString(),
          };
          await change((draft) => {
            draft.quickNotes.push(note);
          });
          setBody("");
          announce("Catatan tersimpan.");
        }}
      >
        <Field label="Catatan baru">
          <textarea
            autoFocus
            required
            maxLength={5000}
            rows={4}
            placeholder="Apa yang ingin kamu ingat?"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>
      </Form>
      <section className="quick-notes-history" aria-label="Catatan tersimpan">
        <h3>
          Catatan tersimpan <span>{notes.length}</span>
        </h3>
        {notes.length ? (
          [...notes].reverse().map((note) => (
            <article key={note.id}>
              <p>{note.body}</p>
              <time dateTime={note.createdAt}>
                {stamp(note.createdAt)} · Shanghai
              </time>
            </article>
          ))
        ) : (
          <p className="muted">Belum ada catatan. Mulai dari satu pikiran.</p>
        )}
      </section>
    </Modal>
  );
}
