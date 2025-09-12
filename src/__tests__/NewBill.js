/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom"
import userEvent from "@testing-library/user-event"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"

jest.mock("../app/store", () => mockStore)
jest.mock("../app/Store.js", () => mockStore)

// Given: je suis connecté en tant qu'Employee
// When: j'arrive sur la page NewBill
// Then: le formulaire est affiché
describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the form should be rendered", () => {
      const html = NewBillUI()
      document.body.innerHTML = html
      expect(screen.getByTestId("form-new-bill")).toBeTruthy()
      expect(screen.getByTestId("expense-type")).toBeTruthy()
      expect(screen.getByTestId("expense-name")).toBeTruthy()
      expect(screen.getByTestId("amount")).toBeTruthy()
      expect(screen.getByTestId("datepicker")).toBeTruthy()
      expect(screen.getByTestId("vat")).toBeTruthy()
      expect(screen.getByTestId("pct")).toBeTruthy()
      expect(screen.getByTestId("commentary")).toBeTruthy()
      expect(screen.getByTestId("file")).toBeTruthy()
    })
  })
})

// validation du fichier et envoi
describe("Given I am on NewBill Page", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock })
    window.localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "employee@test.tld" }))
    document.body.innerHTML = NewBillUI()
  })

  test("When I upload an invalid file, Then an alert is shown and input is cleared", async () => {
    // Given
    const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
    const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })

    // Mock alert
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {})

    const fileInput = screen.getByTestId("file")
    const invalidFile = new File(["dummy"], "justif.pdf", { type: "application/pdf" })

    
    await userEvent.upload(fileInput, invalidFile)

    expect(alertSpy).toHaveBeenCalled()
    expect(fileInput.value).toBe("")

    alertSpy.mockRestore()
  })

  test("When I upload a valid image, Then create is called and file info is stored", async () => {
    
    const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
    const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })

    const createSpy = jest.spyOn(mockStore, "bills")

    const fileInput = screen.getByTestId("file")
    // simule valeur de l'input comme le navigateur la fournirait (fakepath)
    Object.defineProperty(fileInput, 'value', { value: 'C\\\\fakepath\\\\note.png' })
    const validFile = new File(["dummy"], "note.png", { type: "image/png" })

    // When
    await userEvent.upload(fileInput, validFile)

    // Then
    expect(createSpy).toHaveBeenCalled()
    // attend promesse résolue et l'assignation fileUrl/fileName
    await waitFor(() => expect(newBill.fileUrl).toBeTruthy())
    expect(newBill.fileName).toBe("note.png")
  })

  test("When I submit the form with valid data, Then update is called and navigation to Bills happens", async () => {
    const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
    const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })

    // re-remplie le fichier comme si handleChangeFile avait déjà été exécuté avec succès
    newBill.fileUrl = "https://localhost:3456/images/test.jpg"
    newBill.fileName = "test.jpg"
    newBill.billId = "1234"

    // remplie le formulaire
    fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } })
    fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Taxi" } })
    fireEvent.change(screen.getByTestId("amount"), { target: { value: "45" } })
    fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-05-12" } })
    fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } })
    fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } })
    fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Trajet client" } })

    const form = screen.getByTestId("form-new-bill")

    // surveille update pour s'assurer qu'il est appelé
    const updateSpy = jest.spyOn(mockStore, "bills")

    fireEvent.submit(form)

    // Then: navigation vers Bills
    await waitFor(() => expect(document.body.innerHTML).toMatch(/Mes notes de frais|Bills/i))
    expect(updateSpy).toHaveBeenCalled()
  })
})

// POST NewBill (flux complet via le router)
// Given: je suis employé et je navigue vers NewBill via le router
// When: je remplis le formulaire et j'upload un fichier valide puis je soumets
// Then: la note est envoyée (create + update mockés) et je suis redirigé vers Bills

describe("Given I am a user connected as Employee", () => {
  describe("When I post a new bill from the NewBill page", () => {
    test("Then it should call API and navigate back to Bills", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock })
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
      
      // Given: rend directement la page NewBill et instancie le container avec onNavigate qui rend la route
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
      document.body.innerHTML = NewBillUI()
      const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
      expect(screen.getByTestId("form-new-bill")).toBeTruthy()

      // upload fichier valide
      const fileInput = screen.getByTestId("file")
      const validFile = new File(["content"], "justif.jpg", { type: "image/jpg" })
      await userEvent.upload(fileInput, validFile)

      // remplie champs obligatoires
      fireEvent.change(screen.getByTestId("expense-type"), { target: { value: "Transports" } })
      fireEvent.change(screen.getByTestId("expense-name"), { target: { value: "Taxi" } })
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "60" } })
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-06-01" } })
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } })
      fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Déplacement RDV" } })

      fireEvent.submit(screen.getByTestId("form-new-bill"))

      await waitFor(() => screen.getByText("Mes notes de frais"))
      expect(screen.getByText("Mes notes de frais")).toBeTruthy()
    })
  })
})
