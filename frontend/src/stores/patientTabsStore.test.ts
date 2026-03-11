import { describe, it, expect, beforeEach } from 'vitest'
import { usePatientTabsStore } from './patientTabsStore'

beforeEach(() => {
  usePatientTabsStore.setState({
    openPatients: [],
    activePatientId: null,
  })
})

describe('openPatient', () => {
  it('добавляет нового пациента с вкладкой info', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    const { openPatients, activePatientId } = usePatientTabsStore.getState()
    expect(openPatients).toHaveLength(1)
    expect(openPatients[0].pseudonym).toBe('Иванов И.И.')
    expect(openPatients[0].tabs[0].id).toBe('info')
    expect(openPatients[0].activeTabId).toBe('info')
    expect(activePatientId).toBe('1')
  })

  it('не дублирует пациента при повторном вызове', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    expect(usePatientTabsStore.getState().openPatients).toHaveLength(1)
  })

  it('переключает на уже открытого пациента', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().openPatient('2', 'Петрова А.С.')
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    expect(usePatientTabsStore.getState().activePatientId).toBe('1')
  })
})

describe('closePatient', () => {
  it('удаляет пациента из списка', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().closePatient('1')
    expect(usePatientTabsStore.getState().openPatients).toHaveLength(0)
    expect(usePatientTabsStore.getState().activePatientId).toBeNull()
  })

  it('переключает activePatientId на другого при закрытии активного', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().openPatient('2', 'Петрова А.С.')
    usePatientTabsStore.getState().closePatient('2')
    expect(usePatientTabsStore.getState().activePatientId).toBe('1')
  })
})

describe('addProtocolTab', () => {
  it('добавляет вкладку protocol-new', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().addProtocolTab('1')
    const patient = usePatientTabsStore.getState().openPatients[0]
    expect(patient.tabs).toHaveLength(2)
    expect(patient.tabs[1].type).toBe('protocol-new')
    expect(patient.tabs[1].closable).toBe(true)
    expect(patient.activeTabId).toBe(patient.tabs[1].id)
  })
})

describe('closeTab', () => {
  it('закрывает вкладку протокола и переключает на info', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().addProtocolTab('1')
    const tabId = usePatientTabsStore.getState().openPatients[0].tabs[1].id
    usePatientTabsStore.getState().closeTab('1', tabId)
    const patient = usePatientTabsStore.getState().openPatients[0]
    expect(patient.tabs).toHaveLength(1)
    expect(patient.activeTabId).toBe('info')
  })

  it('не закрывает вкладку info', () => {
    usePatientTabsStore.getState().openPatient('1', 'Иванов И.И.')
    usePatientTabsStore.getState().closeTab('1', 'info')
    expect(usePatientTabsStore.getState().openPatients[0].tabs).toHaveLength(1)
  })
})
