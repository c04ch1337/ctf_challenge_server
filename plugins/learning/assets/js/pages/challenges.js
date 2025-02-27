import "./main";
import "bootstrap/js/dist/tab";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/collapse";
import { ezQuery, ezAlert } from "core/ezq";
import { htmlEntities } from "core/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import $ from "jquery";
import CTFd from "core/CTFd";
import config from "core/config";
import hljs from "highlight.js";

dayjs.extend(relativeTime);

const api_func = {
  teams: x => CTFd.api.get_team_solves({ teamId: x }),
  users: x => CTFd.api.get_user_solves({ userId: x })
};

CTFd._internal.challenge = {};
let challenges = [];
let user_solves = [];

const loadChal = id => {
  const chal = $.grep(challenges, chal => chal.id == id)[0];

  if (chal.type === "hidden") {
    ezAlert({
      title: "Challenge Hidden!",
      body: "You haven't unlocked this challenge yet!",
      button: "Got it!"
    });
    return;
  }

  displayChal(chal);
};

const loadChalByName = name => {
  let idx = name.lastIndexOf("-");
  let pieces = [name.slice(0, idx), name.slice(idx + 1)];
  let id = pieces[1];

  const chal = $.grep(challenges, chal => chal.id == id)[0];
  displayChal(chal);
};

const displayChal = chal => {
  return Promise.all([
    CTFd.api.get_challenge({ challengeId: chal.id }),
    $.getScript(config.urlRoot + chal.script),
    $.get(config.urlRoot + chal.template)
  ]).then(responses => {
    const challenge = CTFd._internal.challenge;

    $("#challenge-window").empty();

    // Inject challenge data into the plugin
    challenge.data = responses[0].data;

    // Call preRender function in plugin
    challenge.preRender();

    // Build HTML from the Jinja response in API
    $("#challenge-window").append(responses[0].data.view);

    $("#challenge-window #challenge-input").addClass("form-control");
    $("#challenge-window #challenge-submit").addClass(
      "btn btn-md btn-outline-secondary float-right"
    );

    let modal = $("#challenge-window").find(".modal-dialog");
    if (
      window.init.theme_settings &&
      window.init.theme_settings.challenge_window_size
    ) {
      switch (window.init.theme_settings.challenge_window_size) {
        case "sm":
          modal.addClass("modal-sm");
          break;
        case "lg":
          modal.addClass("modal-lg");
          break;
        case "xl":
          modal.addClass("modal-xl");
          break;
        default:
          break;
      }
    }

    $(".challenge-solves").click(function(event) {
      getSolves($("#challenge-id").val());
    });
    $(".nav-tabs a").click(function(event) {
      event.preventDefault();
      $(this).tab("show");
    });

    // Handle modal toggling
    $("#challenge-window").on("hide.bs.modal", function(event) {
      $("#challenge-input").removeClass("wrong");
      $("#challenge-input").removeClass("correct");
      $("#incorrect-key").slideUp();
      $("#correct-key").slideUp();
      $("#already-solved").slideUp();
      $("#too-fast").slideUp();
    });

    $(".load-hint").on("click", function(event) {
      loadHint($(this).data("hint-id"));
    });

    $("#challenge-submit").click(function(event) {
      event.preventDefault();
      $("#challenge-submit").addClass("disabled-button");
      $("#challenge-submit").prop("disabled", true);
      CTFd._internal.challenge
        .submit()
        .then(renderSubmissionResponse)
        .then(loadChals)
        .then(markSolves);
    });

    $("#challenge-input").keyup(event => {
      if (event.keyCode == 13) {
        $("#challenge-submit").click();
      }
    });

    $(".input-field").bind({
      focus: function() {
        $(this)
          .parent()
          .addClass("input--filled");
      },
      blur: function() {
        const $this = $(this);
        if ($this.val() === "") {
          $this.parent().removeClass("input--filled");
          const $label = $this.siblings(".input-label");
          $label.removeClass("input--hide");
        }
      }
    });

    challenge.postRender();

    $("#challenge-window")
      .find("pre code")
      .each(function(_idx) {
        hljs.highlightBlock(this);
      });

    window.location.replace(
      window.location.href.split("#")[0] + `#${chal.name}-${chal.id}`
    );
    $("#challenge-window").modal();
  });
};

function renderSubmissionResponse(response) {
  const result = response.data;

  const result_message = $("#result-message");
  const result_notification = $("#result-notification");
  const answer_input = $("#challenge-input");
  result_notification.removeClass();
  result_message.text(result.message);

  if (result.status === "authentication_required") {
    window.location =
      CTFd.config.urlRoot +
      "/login?next=" +
      CTFd.config.urlRoot +
      window.location.pathname +
      window.location.hash;
    return;
  } else if (result.status === "incorrect") {
    // Incorrect key
    result_notification.addClass(
      "alert alert-danger alert-dismissable text-center"
    );
    result_notification.slideDown();

    answer_input.removeClass("correct");
    answer_input.addClass("wrong");
    setTimeout(function() {
      answer_input.removeClass("wrong");
    }, 3000);
  } else if (result.status === "correct") {
    // Challenge Solved
    result_notification.addClass(
      "alert alert-success alert-dismissable text-center"
    );
    result_notification.slideDown();

    if (
      $(".challenge-solves")
        .text()
        .trim()
    ) {
      // Only try to increment solves if the text isn't hidden
      $(".challenge-solves").text(
        parseInt(
          $(".challenge-solves")
            .text()
            .split(" ")[0]
        ) +
          1 +
          " Solves"
      );
    }

    answer_input.val("");
    answer_input.removeClass("wrong");
    answer_input.addClass("correct");
  } else if (result.status === "already_solved") {
    // Challenge already solved
    result_notification.addClass(
      "alert alert-info alert-dismissable text-center"
    );
    result_notification.slideDown();

    answer_input.addClass("correct");
  } else if (result.status === "paused") {
    // CTF is paused
    result_notification.addClass(
      "alert alert-warning alert-dismissable text-center"
    );
    result_notification.slideDown();
  } else if (result.status === "ratelimited") {
    // Keys per minute too high
    result_notification.addClass(
      "alert alert-warning alert-dismissable text-center"
    );
    result_notification.slideDown();

    answer_input.addClass("too-fast");
    setTimeout(function() {
      answer_input.removeClass("too-fast");
    }, 3000);
  }
  setTimeout(function() {
    $(".alert").slideUp();
    $("#challenge-submit").removeClass("disabled-button");
    $("#challenge-submit").prop("disabled", false);
  }, 3000);
}

function markSolves() {
  return api_func[CTFd.config.userMode]("me").then(function(response) {
    const solves = response.data;
    for (let i = solves.length - 1; i >= 0; i--) {
      const btn = $('a[value="' + solves[i].challenge_id + '"]');
      if (!btn.hasClass("solved-challenge")) {
        btn.addClass("solved-challenge");
        btn
          .find("li")
          .append("<i class='fas fa-check corner-button-check'></i>");
      }
    }
  });
}

function loadUserSolves() {
  if (CTFd.user.id == 0) {
    return Promise.resolve();
  }

  return api_func[CTFd.config.userMode]("me").then(function(response) {
    const solves = response.data;

    for (let i = solves.length - 1; i >= 0; i--) {
      const chal_id = solves[i].challenge_id;
      user_solves.push(chal_id);
    }
  });
}

function getSolves(id) {
  return CTFd.api.get_challenge_solves({ challengeId: id }).then(response => {
    const data = response.data;
    $(".challenge-solves").text(parseInt(data.length) + " Solves");
    const box = $("#challenge-solves-names");
    box.empty();
    for (let i = 0; i < data.length; i++) {
      const id = data[i].account_id;
      const name = data[i].name;
      const date = dayjs(data[i].date).fromNow();
      const account_url = data[i].account_url;
      box.append(
        '<tr><td><a href="{0}">{2}</td><td>{3}</td></tr>'.format(
          account_url,
          id,
          htmlEntities(name),
          date
        )
      );
    }
  });
}

function natural_sort(a, b) {
  var ax = [],
    bx = [];

  a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) {
    ax.push([$1 || Infinity, $2 || ""]);
  });
  b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) {
    bx.push([$1 || Infinity, $2 || ""]);
  });

  while (ax.length && bx.length) {
    var an = ax.shift();
    var bn = bx.shift();
    var nn = an[0] - bn[0] || an[1].localeCompare(bn[1]);
    if (nn) return nn;
  }

  return ax.length - bx.length;
}

function natural_sort_object(a, b) {
  return natural_sort(a.name, b.name);
}

function loadChals() {
  return CTFd.api.get_challenge_list().then(function(response) {
    let categories = [];
    const $challenges_board = $("#challenges-board");
    challenges = response.data;

    // Get the target of a currently expanded row to expand it later
    let targets = [];
    $(".card-header[data-expanded=true]").each((i, e) => {
      targets.push($(e).attr("data-target"));
    });

    $challenges_board.empty();

    const template =
      '<div class="card">\n' +
      '    <div class="card-header cursor-p" role="tab" data-toggle="collapse">\n' +
      '        <h5 class="mb-0">\n' +
      '            <a data-toggle="collapse" href="#collapseOne" class="card-link">\n' +
      "            </a>\n" +
      "        </h5>\n" +
      "    </div>\n" +
      '    <div id="collapseOne" class="collapse card-block" role="tabpanel">\n' +
      '        <div class="card-body">\n' +
      "        </div>\n" +
      "    </div>\n" +
      "</div>";

    for (let i = 0; i < challenges.length; i++) {
      challenges[i].solves = 0;
      if ($.inArray(challenges[i].category, categories) == -1) {
        let category = challenges[i].category;
        categories.push(category);
      }
    }

    categories = categories.sort(natural_sort);

    for (let i = 0; i < categories.length; i++) {
      let category = categories[i];
      let category_id = category.replace(/ /g, "-").hashCode();
      let category_target = "#" + category_id;

      let category_block = $(template);
      category_block
        .find(".card-link")
        .attr("data-target", category_target)
        .text(category);
      category_block.find(".card-header").attr("data-target", category_target);
      category_block.find(".card-header").attr("data-expanded", false);
      category_block.find(".card-block").attr("id", category_id);

      // If this is a previously known category that's expanded
      // we should re-expand it.
      if (targets.includes(category_target)) {
        category_block.find(".card-header").attr("data-expanded", true);
        category_block.find(".card-block").addClass("show");
      }

      $("#challenges-board").append(category_block);
    }

    // Change sorting order of challenges based on theme settings
    if (
      window.init.theme_settings &&
      window.init.theme_settings.challenge_ordering
    ) {
      switch (window.init.theme_settings.challenge_ordering) {
        case "points":
          break;
        case "name":
          challenges = challenges.sort(natural_sort_object);
          break;
        default:
          break;
      }
    }

    for (let i = 0; i < challenges.length; i++) {
      let chalinfo = challenges[i];
      let chalid = chalinfo.name.replace(/ /g, "-").hashCode();
      let catid = chalinfo.category.replace(/ /g, "-").hashCode();
      let chalwrap = $('<ul class="list-group"></ul>'.format(chalid));
      let chalbutton;

      if (user_solves.indexOf(chalinfo.id) == -1) {
        chalbutton = $(
          "<a class='challenge-button cursor-p pb-2' value='{0}'><li class='list-group-item' value='{0}'>{1} - {2} pts</li></a>".format(
            chalinfo.id,
            chalinfo.name,
            chalinfo.value
          )
        );
      } else {
        chalbutton = $(
          "<a class='solved-challenge challenge-button cursor-p pb-2' value='{0}'><li class='list-group-item text-muted' value='{0}'>{1} - {2} pts <i class='fas fa-check corner-button-check'></i></li></a>".format(
            chalinfo.id,
            chalinfo.name,
            chalinfo.value
          )
        );
      }

      for (let j = 0; j < chalinfo.tags.length; j++) {
        let tag = "tag-" + chalinfo.tags[j].value.replace(/ /g, "-");
        chalwrap.addClass(tag);
      }

      chalwrap.append(chalbutton);

      $("#" + catid)
        .find(".card-body")
        .append(chalwrap);
    }

    $("[data-toggle=collapse]").on("click", function(e) {
      let target = $(this).data("target");
      $(target).collapse("toggle");
      let exp = $(this).attr("data-expanded");
      if (exp === "false") {
        $(this).attr("data-expanded", true);
      } else {
        $(this).attr("data-expanded", false);
      }
    });

    $(".challenge-button").click(function(event) {
      $value = $(this).attr("value");
      loadChal($value);
      getSolves($value);
    });
  });
}

function update() {
  return loadUserSolves() // Load the user's solved challenge ids
    .then(loadChals) //  Load the full list of challenges
    .then(markSolves);
}

$(() => {
  update().then(() => {
    if (window.location.hash.length > 0) {
      loadChalByName(decodeURIComponent(window.location.hash.substring(1)));
    }
  });

  $("#challenge-input").keyup(function(event) {
    if (event.keyCode == 13) {
      $("#challenge-submit").click();
    }
  });

  $(".nav-tabs a").click(function(event) {
    event.preventDefault();
    $(this).tab("show");
  });

  $("#challenge-window").on("hidden.bs.modal", function(event) {
    $(".nav-tabs a:first").tab("show");
    history.replaceState("", window.document.title, window.location.pathname);
  });

  $(".challenge-solves").click(function(event) {
    getSolves($("#challenge-id").val());
  });

  $("#challenge-window").on("hide.bs.modal", function(event) {
    $("#challenge-input").removeClass("wrong");
    $("#challenge-input").removeClass("correct");
    $("#incorrect-key").slideUp();
    $("#correct-key").slideUp();
    $("#already-solved").slideUp();
    $("#too-fast").slideUp();
  });
});
setInterval(update, 300000); // Update every 5 minutes.

const displayHint = data => {
  ezAlert({
    title: "Hint",
    body: data.html,
    button: "Got it!"
  });
};

const displayUnlock = id => {
  ezQuery({
    title: "Unlock Hint?",
    body: "Are you sure you want to open this hint?",
    success: () => {
      const params = {
        target: id,
        type: "hints"
      };
      CTFd.api.post_unlock_list({}, params).then(response => {
        if (response.success) {
          CTFd.api.get_hint({ hintId: id }).then(response => {
            displayHint(response.data);
          });

          return;
        }

        ezAlert({
          title: "Error",
          body: response.errors.score,
          button: "Got it!"
        });
      });
    }
  });
};

const loadHint = id => {
  CTFd.api.get_hint({ hintId: id }).then(response => {
    if (response.data.content) {
      displayHint(response.data);
      return;
    }

    displayUnlock(id);
  });
};
