import ContactForm from "./ContactForm";

export default function Contact() {
  return (
    <section id="contact" className="section">
      <h2>Contact</h2>
      <p>
        Vous avez un projet ou souhaitez échanger sur le DevOps et le Cloud ?
        N'hésitez pas à me contacter.
      </p>

      <div className="contact-info">
        <p>
          <strong>Email :</strong>{" "}
          <a href="mailto:omelkirrebei22@gmail.com">
            omelkirrebei22@gmail.com
          </a>
        </p>

        <p>
          <strong>GitHub :</strong>{" "}
          <a
            href="https://github.com/omelkir20"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/omelkir20
          </a>
        </p>
      </div>

      <ContactForm />
    </section>
  );
}
