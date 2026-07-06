(() => {
  const config = window.PRIVATE_CLOUD_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(config.url || "") &&
    config.publishableKey && !config.publishableKey.startsWith("YOUR_");
  const client = configured && window.supabase
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;

  const cachedQuestionsKey = "asset-appraiser-private-questions-v1";

  async function signIn(email, password) {
    if (!client) throw new Error("私人云端还没有完成配置。");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function signUp(email, password) {
    if (!client) throw new Error("私人云端还没有完成配置。");
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (client) await client.auth.signOut();
  }

  async function session() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function loadQuestions() {
    if (!client) return JSON.parse(localStorage.getItem(cachedQuestionsKey) || "[]");
    const { data, error } = await client
      .from("quiz_questions")
      .select("question_data")
      .order("id");
    if (error) throw error;
    const questions = (data || []).map(row => row.question_data);
    if (questions.length) localStorage.setItem(cachedQuestionsKey, JSON.stringify(questions));
    return questions.length ? questions : JSON.parse(localStorage.getItem(cachedQuestionsKey) || "[]");
  }

  async function loadState() {
    if (!client) return null;
    const current = await session();
    if (!current) return null;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user?.user_metadata?.quiz_state || null;
  }

  async function saveState(state) {
    if (!client) return;
    const current = await session();
    if (!current) return;
    const { error } = await client.auth.updateUser({
      data: { quiz_state: state }
    });
    if (error) throw error;
  }

  window.PrivateCloud = {
    configured,
    signIn,
    signUp,
    signOut,
    session,
    loadQuestions,
    loadState,
    saveState
  };
})();
