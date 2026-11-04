import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "../app/components/ContactForm";

const fill = async (user) => {
  await user.type(screen.getByLabelText("Nom"), "Ahmed Ben Ali");
  await user.type(screen.getByLabelText("Email"), "ahmed@example.com");
  await user.type(screen.getByLabelText("Message"), "Bonjour, ceci est un message de test.");
};

const mockFetch = (status, body) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => vi.stubGlobal("fetch", mockFetch(201, { status: "success", message: "Message enregistré, merci !" })));
afterEach(() => vi.unstubAllGlobals());

describe("<ContactForm />", () => {
  it("affiche les trois champs et le bouton Envoyer", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeInTheDocument();
  });

  it("envoie les données en POST vers /api/contact et affiche le succès", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Message enregistré, merci !"));
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      name: "Ahmed Ben Ali",
      email: "ahmed@example.com",
      message: "Bonjour, ceci est un message de test.",
    });
    expect(screen.getByLabelText("Nom")).toHaveValue(""); // formulaire réinitialisé
  });

  it("affiche les erreurs de validation renvoyées par l'API", async () => {
    vi.stubGlobal("fetch", mockFetch(400, {
      status: "error", code: "VALIDATION_ERROR", message: "Données invalides",
      details: [{ field: "email", message: "L'email est invalide" }],
    }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText("L'email est invalide")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Données invalides");
  });

  it("affiche un message dédié en cas de 429", async () => {
    vi.stubGlobal("fetch", mockFetch(429, { status: "error", code: "TOO_MANY_REQUESTS", message: "Trop de requêtes" }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Trop de messages envoyés");
  });

  it("gère une API injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Impossible de joindre le serveur");
  });
});
