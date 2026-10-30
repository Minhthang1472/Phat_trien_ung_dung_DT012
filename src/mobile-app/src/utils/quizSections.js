/**
 * Tiện ích nhóm câu hỏi trắc nghiệm theo các section của bản tóm tắt.
 * Hoạt động theo hướng "additive": nếu dữ liệu cũ không có section,
 * trả về một nhóm duy nhất để UI cũ vẫn hiển thị bình thường.
 */

export function formatSectionTime(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
    return '';
  }
  const total = Math.max(0, Math.floor(Number(seconds)));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatSectionRange(section) {
  if (!section) return '';
  const start = formatSectionTime(section.start_sec);
  const end = formatSectionTime(section.end_sec);
  if (!start && !end) return '';
  if (!end) return start;
  return `${start} - ${end}`;
}

function matchesSection(question, section) {
  if (!question || !section) return false;
  if (question.section_id !== null && question.section_id !== undefined) {
    return String(question.section_id) === String(section.id);
  }
  if (question.section_title) {
    return (
      String(question.section_title).trim().toLowerCase() ===
      String(section.title || '').trim().toLowerCase()
    );
  }
  if (question.timestamp_sec !== null && question.timestamp_sec !== undefined) {
    const ts = Number(question.timestamp_sec);
    const start = Number(section.start_sec || 0);
    const end = Number(section.end_sec || 0);
    return ts >= start && (end <= 0 || ts <= end);
  }
  return false;
}

export function buildQuizGroups(quizList, sections) {
  const questions = Array.isArray(quizList) ? quizList : [];
  const sectionList = Array.isArray(sections) ? sections.filter(Boolean) : [];

  if (sectionList.length === 0) {
    return questions.length
      ? [{ key: 'all', section: null, questions: questions.map((quiz, index) => ({ quiz, index })) }]
      : [];
  }

  const groups = sectionList.map((section, index) => ({
    key: `section_${section.id || index}`,
    section,
    questions: [],
  }));

  const unassigned = [];
  questions.forEach((quiz, index) => {
    const target = groups.find((group) => matchesSection(quiz, group.section));
    if (target) {
      target.questions.push({ quiz, index });
    } else {
      unassigned.push({ quiz, index });
    }
  });

  // Câu hỏi không có metadata section: trải đều vào các nhóm để không bị mất.
  unassigned.forEach((entry, position) => {
    groups[position % groups.length].questions.push(entry);
  });

  return groups.filter((group) => group.questions.length > 0);
}
