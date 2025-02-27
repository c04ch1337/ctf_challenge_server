if (CTFd._internal.challenge) {
    var challenge = CTFd._internal.challenge;
} else {
    var challenge = window.challenge;
}

function capitalize(s) {
    return (s && s[0].toUpperCase() + s.slice(1)) || ""
}

challenge.data = undefined;

challenge.preRender = function () {};

challenge.render = function () {};

challenge.postRender = () => {
    setTimeout(async () => {
        // Don't hijack the enter button
        // Clone element to remove keyup event handler. Not sure why .off wont work
        document.querySelector("#challenge-input").replaceWith(
            document.querySelector("#challenge-input").cloneNode(true)
        );

        // Populate Submissions
        const challenge_id = parseInt(document.querySelector("#challenge-id").value);
        const url = "/submissions/" + challenge_id;

        const res = await CTFd.fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            }
        })

        const response = await res.json();
        const container = document.querySelector("#challenge-submissions");
        container.innerHTML = "";

        for (const status of ['correct', 'pending', 'awarded', 'incorrect']) {
            const header = CTFd.utils.html.createHtmlNode(`<h3 class="mb-3">${capitalize(status)}</h3>`);
            container.appendChild(header);

            if (response['data'][status].length === 0) {
                container.appendChild(CTFd.utils.html.createHtmlNode(`<h4 class="text-muted mb-2">No ${status} submissions</h4>`));
                container.appendChild(CTFd.utils.html.createHtmlNode("<hr>"));
                continue;
            }

            // Detect which version of dayjs we have to avoid issues on older themes
            // TODO: Remove in CTFd 4.0
            let method = "toString";
            let test = CTFd.lib.dayjs("1/1/2020");
            if (typeof test.fromNow === 'function') {
                method = "fromNow";
            }

            for (const submission of response['data'][status]) {
                const card = CTFd.utils.html.createHtmlNode(`
                  <div class="card mb-4">
                    <div class="card-body">
                        <blockquote class="blockquote mb-0">
                            <p>${CTFd.utils.html.htmlEntities(submission.provided)}</p>
                            <small class="text-muted">${CTFd.lib.dayjs(submission.date)[method]()}</small>
                        </blockquote>
                    </div>
                  </div> `);
                container.appendChild(card);
            }

            container.appendChild(CTFd.utils.html.createHtmlNode("<hr>"));
        }

    }, 200)
};

challenge.submit = async preview => {
    const challenge_id = parseInt(document.querySelector("#challenge-id").value);
    const submission = document.querySelector("#challenge-input").value;

    let res;
    const params = {};
    if (preview) {
        params["preview"] = true;
    }

    res = await CTFd.api.post_challenge_attempt(params, {
        challenge_id: challenge_id,
        submission: submission
    });

    return res;
};
