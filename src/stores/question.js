import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useQuestionStore = defineStore('question', () => {
  const currentQuestion = ref(null)
  const studentAnswer = ref('')
  const gradingResult = ref(null)
  const fromRecord = ref(false)

  function setQuestion(question) {
    currentQuestion.value = question
    studentAnswer.value = ''
    gradingResult.value = null
    fromRecord.value = false
  }

  function setStudentAnswer(answer) {
    studentAnswer.value = answer
  }

  function setGradingResult(result) {
    gradingResult.value = result
  }

  function setFromRecord(val) {
    fromRecord.value = val
  }

  function clear() {
    currentQuestion.value = null
    studentAnswer.value = ''
    gradingResult.value = null
    fromRecord.value = false
  }

  return {
    currentQuestion,
    studentAnswer,
    gradingResult,
    fromRecord,
    setQuestion,
    setStudentAnswer,
    setGradingResult,
    setFromRecord,
    clear
  }
})
