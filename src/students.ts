import type { Student } from './types'

/**
 * 화면 어디서든 학생을 부를 때 쓰는 표기.
 * 동명이인이 많아 이름만으로는 구분이 안 되므로 학번을 항상 앞에 붙인다.
 */
export function studentLabel(student: Student) {
  return `${student.number} ${student.name}`
}
