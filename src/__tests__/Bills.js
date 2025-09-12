/**
 * @jest-environment jsdom
 */

import { screen, waitFor} from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { bills as billsFixture } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon.classList.contains('active-icon')).toBe(true)

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: billsFixture })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })
})

// interactions coté user sur Bills
describe("Given I am on Bills Page", () => {


  test("When I click on new bill button, Then it should navigate to NewBill", async () => {
    // Given: je suis sur la page Bills avec données affichées
    document.body.innerHTML = BillsUI({ data: billsFixture }) // rend la table et le bouton "Nouveau frais"

    const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) } // navigation simulée
    const bills = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage }) // attache les listeners

    const newBillButton = screen.getByTestId('btn-new-bill')
    expect(newBillButton).toBeTruthy()

    // When: je clique sur le bouton de nouvelle note
    const handleClickNewBill = jest.fn(bills.handleClickNewBill)
    newBillButton.addEventListener('click', handleClickNewBill)
    userEvent.click(newBillButton)

    // Then: handler appelé, page NewBill affichée
    expect(handleClickNewBill).toHaveBeenCalled()
    expect(screen.getByText('Envoyer une note de frais')).toBeTruthy() // vérifie si page NewBill est montée
  })

  test("When I click on eye icon with a valid image url, Then a modal with image should open", async () => {
    // Given: je suis sur bills avec des justificatifs valides
    document.body.innerHTML = BillsUI({ data: billsFixture })

    $.fn.modal = jest.fn()

    const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
    // instance de bill pour attacher les listeners sur les icon oeil
    new Bills({ document, onNavigate, store: null, localStorage: window.localStorage })

    const eyes = screen.getAllByTestId('icon-eye')
    expect(eyes.length).toBeGreaterThan(0)

    // when: clique sur icon oeil
    userEvent.click(eyes[0])

    const modal = document.querySelector('#modaleFile')
    expect(modal).toBeTruthy()
    const modalBody = modal.querySelector('.modal-body')
    // Then: la modale s'ouvre et contient une image
    expect(modalBody.innerHTML).toMatch(/<img /) // image bien injectée dans la modale
  })

  test("When I click on eye icon with an invalid url, Then an error message should be shown in modal", async () => {
    // Given: des format invalide (url 'null' et extension)
    const invalidBills = [
      { ...billsFixture[0], fileUrl: 'null' },
      { ...billsFixture[0], fileUrl: 'https://example.com/file.pdf' },
    ]
    document.body.innerHTML = BillsUI({ data: invalidBills })

    $.fn.modal = jest.fn()

    const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
    new Bills({ document, onNavigate, store: null, localStorage: window.localStorage })

    const eyes = screen.getAllByTestId('icon-eye')
    // When: clique sur oeil du justificatif null
    userEvent.click(eyes[0]) // cas 1: URL null => message erreur attendu dans la modale
    let modalBody = document.querySelector('#modaleFile .modal-body')
    // Then: message d'erreur affiché
    expect(modalBody.textContent).toMatch(/Format justificatif invalide/i)

    // When: je clique sur l'oeil du justificatif avec format invalide
    userEvent.click(eyes[1]) // cas 2: format invalide => même message d'erreur
    modalBody = document.querySelector('#modaleFile .modal-body')
    // Then: message erreur affiché
    expect(modalBody.textContent).toMatch(/Format justificatif invalide/i)
  })
})

// Scénario 3: test unitaire service getBills (succès)
describe("Given I am an Employee and I fetch bills", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
  })

  test("Then getBills should return a list of bills from the store", async () => {
    // Given: store mocké et navigation initialisée
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.append(root)
    router()

    const bills = new Bills({ document, onNavigate: window.onNavigate, store: mockStore, localStorage: window.localStorage })
    // When: appelle getBills()
    const data = await bills.getBills()
    // Then: reçois une liste de notes de frais
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })
})

// Scénario 4: tests d'intégration GET Bills (succès + erreurs 404/500)
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET and displays them", async () => {
      // Given: user employé et route initialisée
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }));
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      // When: navigue vers Bills
      window.onNavigate(ROUTES_PATH.Bills)

      // Then: affiche la table et au moins une ligne/oeil
      await waitFor(() => screen.getByText("Mes notes de frais"))
      const tbody = screen.getByTestId('tbody')
      expect(tbody).toBeTruthy()
      // au moins une ligne via Actions/eye icon
      expect(screen.getAllByTestId('icon-eye').length).toBeGreaterThan(0)
    })
  })

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills") // surcharge list() par test (404/500)
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })

    test("fetches bills and fails with 404 message error", async () => {
      // Given: api renvoie 404
      mockStore.bills.mockImplementationOnce(() => {
        return { list: () => Promise.reject(new Error("Erreur 404")) }
      })
      // When: navigue vers Bills
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      // Then: message d'erreur 404 affiché
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("fetches bills and fails with 500 message error", async () => {
      // Given: api renvoie erreur 500
      mockStore.bills.mockImplementationOnce(() => {
        return { list: () => Promise.reject(new Error("Erreur 500")) }
      })
      // When: navigue vers Bills
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      // Then: erreur 500 affiché
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})
