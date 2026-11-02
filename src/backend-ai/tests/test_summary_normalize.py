from app.services.summary_service import (
    normalize_exercises,
    normalize_mindmap,
    normalize_quiz,
    normalize_sections,
    quiz_count_for_duration,
)


def test_quiz_count_for_duration_scales_with_length():
    assert quiz_count_for_duration(None) == 5
    assert quiz_count_for_duration(60) == 4
    assert quiz_count_for_duration(900) == 10
    assert quiz_count_for_duration(4000) == 24


def test_normalize_quiz_balances_answers_and_options():
    quiz = normalize_quiz(
        [
            {"question": "Q1?", "options": ["A. Đúng", "B. Sai"], "correct_answer": "A"},
            {"question": "Q2?", "options": ["A. Một", "B. Hai", "C. Ba"], "correct_answer": "B"},
        ]
    )
    assert len(quiz) == 2
    for item in quiz:
        assert item["question"]
        assert len(item["options"]) >= 2
        assert item["correct_answer"] in ("A", "B", "C", "D")
        assert item["answer"] == item["correct_answer"]


def test_normalize_quiz_ignores_invalid_input():
    assert normalize_quiz(None) == []
    assert normalize_quiz("not-a-list") == []


def test_normalize_mindmap_keeps_valid_tree():
    tree = {"title": "Root", "children": [{"name": "Child", "children": []}]}
    result = normalize_mindmap(tree)
    assert result["title"] == "Root"
    assert result["children"][0]["title"] == "Child"


def test_normalize_mindmap_generates_tree_from_key_points():
    result = normalize_mindmap(None, default_title="Bài học", key_points=["A: chi tiết A"])
    assert result["title"] == "Bài học"
    assert result["children"]
    assert result["children"][0]["title"] == "A"


def test_normalize_sections_returns_list():
    sections = normalize_sections(
        [{"title": "Mở đầu", "start": 0, "end": 60, "summary": "Nội dung"}],
        duration_seconds=120,
    )
    assert isinstance(sections, list)
    assert sections[0]["title"] == "Mở đầu"


def test_normalize_exercises_generates_from_key_points():
    exercises = normalize_exercises(None, key_points=["Khái niệm A", "Khái niệm B"])
    assert exercises
    assert all({"question", "answer", "hint"} <= set(item) for item in exercises)
