export const getOrCreateSessionId = () => {
    let sid = localStorage.getItem("aasaasi_session");
    if (!sid) {
      const rnd = (globalThis.crypto && "randomUUID" in globalThis.crypto)
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      sid = `sess_${rnd}`;
      localStorage.setItem("aasaasi_session", sid);
    }
    return sid;
  };
  