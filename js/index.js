const API_URL = "https://api-inference.huggingface.co/models/cactode/gpt2_urbandict_textgen_torch";
// api key associated with a burner account, def a bad idea but lmao gotta send it
const HEADERS =  { Authorization: 'Bearer api_wtvGnGQrPMrSOKryYagJAQDjqmZdCfmBMz' };

let vm = new Vue({
    el: "#app",
    data: {
        is_loading: false,
        model_loading_progress: 0,
        model_loading_message: "",
        error_word: false,
        word: "",
        word_defs: []
    },
    methods: {
        defineWord: async function () {
            // prevent extra executions
            if (this.is_loading) {
                return;
            }

            // validate entry
            this.word = this.word.trim().toLowerCase().replace(/[^a-zA-Z0-9 !.,?\/\\:;'"\[\]@#\$%\^&\*\(\)]/g, "");
            if (this.word.length < 3) {
                this.error_word = "Word needs to be at least three characters...";
                return;
            }

            // start getting definition from backend
            this.is_loading = true;
            let data = null;

            // if backend is down, stop immediately
            try {
                data = await this.fetchWord(false);
            } catch (e) {
                this.error_word = "Oof, backend is offline.";
                this.is_loading = false;
                return;
            }

            // if model is loading, pause and show progress
            if ('estimated_time' in data) {
                this.model_loading_message = "Model is initializing, stand by...";
                await this.showProgress(data.estimated_time);
                this.model_loading_message = "Almost done...";
                // try again, but tell the backend to only reply when it's done loading
                data = await this.fetchWord(true);
                this.model_loading_progress = 0;
            }

            // free version only accepts so many requests before it craps out, check for this
            if ('error' in data) {
                this.is_loading = false;
                this.error_word = "Oof, something broke. Maybe the API thinks you've submitted too many requests?";
                console.log(data);
                return;
            }

            // display word
            this.is_loading = false;
            let definition = data[0].generated_text;
            this.word_defs.unshift({ word: this.word, definition: definition });
            this.word = "";
        },
        fetchWord: async function (wait_for_model) {
            // define payload and params to send
            let input = "define " + this.word + ":";
            let payload = {
                "inputs": input,
                "parameters": {
                    "return_full_text": false,
                },
                "options": {
                    "use_cache": false,
                    "wait_for_model": wait_for_model
                }
            };
            let params = {
                headers: HEADERS,
                body: JSON.stringify(payload),
                method: "POST",
                cache: 'no-cache'
            };
            // return a promise for the raw json output
            return fetch(API_URL, params)
                .then(response => response.json())
        },
        showProgress: async function (estimated_time) {
            // slowly increment progress bar until time is up
            let start_time = performance.now();
            let elapsed_time = 0;
            do {
                elapsed_time = ((performance.now() - start_time) / 1000);
                this.model_loading_progress = parseInt((elapsed_time / estimated_time) * 100);
                await new Promise(r => setTimeout(r, 500));
            } while (elapsed_time < estimated_time);
        }
    }
});