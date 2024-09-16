/* c8 ignore start */
import { PasswayClient } from './'

class PasswayRegistration extends HTMLElement {
  private client = new PasswayClient({
    apiRoot: 'http://localhost:3123/api',
  })

  get isEncryptionEnabled() {
    return (
      this.shadowRoot?.querySelector<HTMLInputElement>('.encrypt-data')
        ?.checked ?? false
    )
  }

  connectedCallback() {
    const template = document.querySelector<HTMLTemplateElement>(
      'template.playground'
    )

    if (!template) {
      throw new TypeError()
    }

    const shadow = this.attachShadow({ mode: 'open' })
    shadow.appendChild(template.content.cloneNode(true))

    shadow
      .querySelector('button.create-passkey')
      ?.addEventListener('click', async () => {
        await this.client.createPasskey({
          appName: this.getAttribute('app-name') ?? '',
          userName: this.getAttribute('user-name') ?? '',
          userDisplayName: this.getAttribute('user-display-name') ?? '',
        })
      })

    shadow
      .querySelector('button.create-user')
      ?.addEventListener('click', async () => {
        await this.client.createUser()
      })

    shadow
      .querySelector('button.create-session')
      ?.addEventListener('click', async () => {
        await this.client.createSession()
      })

    shadow
      .querySelector('button.destroy-session')
      ?.addEventListener('click', async () => {
        await this.client.destroySession()
      })

    const uploadInput = shadow.querySelector<HTMLInputElement>('input.upload')
    uploadInput?.addEventListener('change', async () => {
      const [file] = uploadInput.files ?? []

      if (!file) {
        console.warn('No file provided')
        return
      }

      const { isEncryptionEnabled } = this

      await this.client.upload(file, { enableEncryption: isEncryptionEnabled })
    })
  }
}

window.customElements.define('passway-registration', PasswayRegistration)

const passwayRegistration = document.createElement('passway-registration')
passwayRegistration.setAttribute('app-name', 'Passway Demo')
passwayRegistration.setAttribute('user-name', 'example-user')
passwayRegistration.setAttribute('user-display-name', 'Example User')

document.body.appendChild(passwayRegistration)
