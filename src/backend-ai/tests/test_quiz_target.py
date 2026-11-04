from app.models.schemas import ProcessVideoRequest
from app.services import summary_service as summary_module
from app.services.summary_service import MAX_QUIZ_COUNT


def test_quiz_target_is_clamped_to_upper_bound():
    result = summary_module.summary_service.summarize_transcript(
        "",
        include_quiz=True,
        duration_seconds=0,
        quiz_target=999,
    )

    assert result["quiz_target"] == MAX_QUIZ_COUNT


def test_quiz_target_is_clamped_to_at_least_one():
    result = summary_module.summary_service.summarize_transcript(
        "",
        include_quiz=True,
        duration_seconds=0,
        quiz_target=-5,
    )

    assert result["quiz_target"] == 1


def test_quiz_target_defaults_to_duration_estimate_when_none():
    result = summary_module.summary_service.summarize_transcript(
        "",
        include_quiz=True,
        duration_seconds=600,
        quiz_target=None,
    )

    assert 1 <= result["quiz_target"] <= MAX_QUIZ_COUNT


def test_process_video_request_accepts_quiz_target():
    request = ProcessVideoRequest(video_url="https://example.com/a.mp4", quiz_target=8)

    assert request.quiz_target == 8


def test_process_video_request_quiz_target_is_optional():
    request = ProcessVideoRequest(video_url="https://example.com/a.mp4")

    assert request.quiz_target is None


def test_process_video_request_rejects_non_numeric_quiz_target():
    try:
        ProcessVideoRequest(video_url="https://example.com/a.mp4", quiz_target="abc")
    except ValueError:
        return
    raise AssertionError("quiz_target không phải số phải bị từ chối")
