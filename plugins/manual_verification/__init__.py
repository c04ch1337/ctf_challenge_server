from flask import Blueprint, jsonify, redirect, render_template, request, url_for

from CTFd.models import Awards, Challenges, Fails, Solves, Submissions, db
from CTFd.plugins import register_plugin_assets_directory
from CTFd.plugins.challenges import CHALLENGE_CLASSES, BaseChallenge
from CTFd.plugins.migrations import upgrade
from CTFd.utils import get_config, set_config
from CTFd.utils.dates import isoformat
from CTFd.utils.decorators import admins_only, authed_only
from CTFd.utils.email import sendmail
from CTFd.utils.modes import USERS_MODE, get_model
from CTFd.utils.user import get_current_user, get_ip
from CTFd.utils.validators import validate_email


class ManualChallenge(Challenges):
    __mapper_args__ = {"polymorphic_identity": "manual_verification"}
    id = db.Column(
        db.Integer, db.ForeignKey("challenges.id", ondelete="CASCADE"), primary_key=True
    )

    def __init__(self, *args, **kwargs):
        super(ManualChallenge, self).__init__(**kwargs)


class Pending(Submissions):
    __mapper_args__ = {"polymorphic_identity": "pending"}


class Awarded(Submissions):
    __mapper_args__ = {"polymorphic_identity": "awarded"}


class ManualSubmissionChallenge(BaseChallenge):
    __version__ = "1.1.3"
    id = "manual_verification"  # Unique identifier used to register challenges
    name = "manual_verification"  # Name of a challenge type
    templates = (
        {  # Handlebars templates used for each aspect of challenge editing & viewing
            "create": "/plugins/manual_verification/assets/create.html",
            "update": "/plugins/manual_verification/assets/update.html",
            "view": "/plugins/manual_verification/assets/view.html",
        }
    )
    scripts = {  # Scripts that are loaded when a template is loaded
        "create": "/plugins/manual_verification/assets/create.js",
        "update": "/plugins/manual_verification/assets/update.js",
        "view": "/plugins/manual_verification/assets/view.js",
    }
    # Route at which files are accessible. This must be registered using register_plugin_assets_directory()
    route = "/plugins/manual_verification/assets/"
    # Blueprint used to access the static_folder directory.
    blueprint = Blueprint(
        "manual_verification",
        __name__,
        template_folder="templates",
        static_folder="assets",
    )
    challenge_model = ManualChallenge

    @staticmethod
    def attempt(challenge, request):
        """
        This method is not used as manual submissions are not solved with the compare() method.

        :param challenge: The Challenge object from the database
        :param request: The request the user submitted
        :return: (boolean, string)
        """
        return False, "Submission under review"

    @staticmethod
    def solve(user, team, challenge, request):
        """
        This method is not used as manual submission challenges are not solved with flags.

        :param team: The Team object from the database
        :param chal: The Challenge object from the database
        :param request: The request the user submitted
        :return:
        """
        pass

    @staticmethod
    def fail(user, team, challenge, request):
        """
        This method is used to insert Pending into the database in order to mark an answer pending.

        :param team: The Team object from the database
        :param chal: The Challenge object from the database
        :param request: The request the user submitted
        :return:
        """
        data = request.form or request.get_json()
        submission = data["submission"].strip()
        pending = Pending(
            user_id=user.id,
            team_id=team.id if team else None,
            challenge_id=challenge.id,
            ip=get_ip(request),
            provided=submission,
        )
        db.session.add(pending)
        db.session.commit()

        # We only send emails if this is the user's only pending submission for this challenge
        count = Pending.query.filter_by(
            user_id=user.id, challenge_id=challenge.id
        ).count()
        contact = get_config("manual_verification_admin_contact")
        if contact and count == 1:
            subject = f"[CTFd] New Submission for '{challenge.name}'"
            user_name = user.name
            team_name = team.name if team else None
            msg = f"{user_name}"
            url = url_for(
                "manual_verifications.view_pending_submissions", _external=True
            )
            if team_name:
                msg += f" from team {team_name}"
            text = (
                f"{msg} has made a submission for {challenge.name} which must be "
                f"manually verified.\n\n"
                f"Go to {url} to grade the submission."
            )
            sendmail(addr=contact, text=text, subject=subject)


def load(app):
    upgrade(plugin_name="manual_verification")
    CHALLENGE_CLASSES["manual_verification"] = ManualSubmissionChallenge
    register_plugin_assets_directory(
        app, base_path="/plugins/manual_verification/assets/"
    )
    manual_verifications = Blueprint(
        "manual_verifications", __name__, template_folder="templates"
    )

    @manual_verifications.route("/submissions/<challenge_id>", methods=["GET"])
    @authed_only
    def submissions_for_challenge(challenge_id):
        user = get_current_user()
        if get_config("user_mode") == USERS_MODE:
            pending = Pending.query.filter_by(
                challenge_id=challenge_id, user_id=user.id
            ).all()
        else:
            pending = Pending.query.filter_by(
                challenge_id=challenge_id, team_id=user.team_id
            ).all()

        if get_config("user_mode") == USERS_MODE:
            correct = Solves.query.filter(
                Solves.user_id == user.id, Solves.challenge_id == challenge_id
            ).all()
        else:
            correct = Solves.query.filter(
                Solves.team_id == user.team_id, Solves.challenge_id == challenge_id
            ).all()

        if get_config("user_mode") == USERS_MODE:
            incorrect = Fails.query.filter(
                Fails.user_id == user.id, Fails.challenge_id == challenge_id
            ).all()
        else:
            incorrect = Fails.query.filter(
                Fails.team_id == user.team_id, Fails.challenge_id == challenge_id
            ).all()

        if get_config("user_mode") == USERS_MODE:
            awarded = Awarded.query.filter(
                Awarded.user_id == user.id, Awarded.challenge_id == challenge_id
            ).all()
        else:
            awarded = Awarded.query.filter(
                Awarded.team_id == user.team_id, Awarded.challenge_id == challenge_id
            ).all()

        pending = [{"provided": p.provided, "date": isoformat(p.date)} for p in pending]
        correct = [{"provided": c.provided, "date": isoformat(c.date)} for c in correct]
        awarded = [{"provided": a.provided, "date": isoformat(a.date)} for a in awarded]
        incorrect = [
            {"provided": i.provided, "date": isoformat(i.date)} for i in incorrect
        ]

        resp = {
            "success": True,
            "data": {
                "pending": pending,
                "correct": correct,
                "awarded": awarded,
                "incorrect": incorrect,
            },
        }
        return jsonify(resp)

    @manual_verifications.route("/admin/submissions/pending", methods=["GET"])
    @admins_only
    def view_pending_submissions():
        filters = {"type": "pending"}

        curr_page = abs(int(request.args.get("page", 1, type=int)))
        results_per_page = 50
        page_start = results_per_page * (curr_page - 1)
        page_end = results_per_page * (curr_page - 1) + results_per_page
        sub_count = Submissions.query.filter_by(**filters).count()
        page_count = int(sub_count / results_per_page) + (
            sub_count % results_per_page > 0
        )

        Model = get_model()

        submissions = (
            Submissions.query.add_columns(
                Submissions.id,
                Submissions.type,
                Submissions.challenge_id,
                Submissions.provided,
                Submissions.account_id,
                Submissions.date,
                Challenges.name.label("challenge_name"),
                Model.name.label("team_name"),
            )
            .filter_by(**filters)
            .join(Challenges)
            .join(Model)
            .order_by(Submissions.date.desc())
            .slice(page_start, page_end)
            .all()
        )

        return render_template(
            "verify_submissions.html",
            submissions=submissions,
            page_count=page_count,
            curr_page=curr_page,
        )

    @manual_verifications.route(
        "/admin/verify_submissions/<submission_id>/<status>", methods=["POST"]
    )
    @admins_only
    def verify_submissions(submission_id, status):
        submission = Submissions.query.filter_by(id=submission_id).first_or_404()

        if status == "solve":
            solve = Solves(
                user_id=submission.user_id,
                team_id=submission.team_id,
                challenge_id=submission.challenge_id,
                ip=submission.ip,
                provided=submission.provided,
                date=submission.date,
            )
            db.session.add(solve)
            # Get rid of pending submissions for the challenge
            Submissions.query.filter(
                Submissions.challenge_id == submission.challenge_id,
                Submissions.team_id == submission.team_id,
                Submissions.user_id == submission.user_id,
                Submissions.type == "pending",
            ).delete()
        elif status == "fail":
            wrong = Fails(
                user_id=submission.user_id,
                team_id=submission.team_id,
                challenge_id=submission.challenge_id,
                ip=submission.ip,
                provided=submission.provided,
                date=submission.date,
            )
            db.session.add(wrong)
        elif status == "award":
            awarded = Awarded(
                user_id=submission.user_id,
                team_id=submission.team_id,
                challenge_id=submission.challenge_id,
                ip=submission.ip,
                provided=submission.provided,
            )
            award = Awards(
                user_id=submission.user_id,
                team_id=submission.team_id,
                name="Submission",
                description="Correct Submission for {name}".format(
                    name=submission.challenge.name
                ),
                value=request.args.get("value", 0),
                category=submission.challenge.category,
            )
            db.session.add(awarded)
            db.session.add(award)

        else:
            return jsonify({"success": False})
        db.session.delete(submission)
        db.session.commit()
        db.session.close()
        return jsonify({"success": True})

    @manual_verifications.route("/admin/manual_verification", methods=["GET", "POST"])
    @admins_only
    def settings():
        contact = get_config("manual_verification_admin_contact")
        if request.method == "GET":
            return render_template("manual_verification.html", contact=contact)
        elif request.method == "POST":
            new_contact = request.form.get("contact", "")
            if new_contact and validate_email(new_contact) is False:
                return render_template(
                    "manual_verification.html", error="Invalid email address"
                )
            else:
                set_config("manual_verification_admin_contact", new_contact)
                return redirect(url_for("manual_verifications.settings"))

    app.register_blueprint(manual_verifications)
