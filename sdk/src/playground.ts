/* c8 ignore start */
import window from 'global/window'
import { createWriteStream } from 'streamsaver'

import { dataTransform } from './services/DataTransform'

import { PasswayClient } from './'

class PasswayRegistration extends HTMLElement {
  private client = new PasswayClient({
    apiRoot: 'http://localhost:3123/api',
  })

  get id() {
    return (
      this.shadowRoot?.querySelector<HTMLInputElement>('.download-content-id')
        ?.value || 'default content ID'
    )
  }

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

      const { isEncryptionEnabled, id } = this

      await this.client.upload(file, {
        enableEncryption: isEncryptionEnabled,
        id,
      })
    })

    const downloadButton =
      shadow.querySelector<HTMLButtonElement>('button.download')

    downloadButton?.addEventListener('click', async () => {
      const contentIdInput = shadow.querySelector<HTMLInputElement>(
        '.download-content-id'
      )

      const contentId = contentIdInput?.value

      if (!contentId) {
        throw new TypeError('contentId is falsy')
      }

      const decryptDataCheckbox =
        shadow.querySelector<HTMLInputElement>('input.decrypt-data')

      const decryptData = Boolean(decryptDataCheckbox?.checked)

      const reader = await this.client.download(contentId ?? '', {
        isEncrypted: decryptData,
      })

      const writeStream = createWriteStream('download')

      const writer = writeStream.getWriter()
      reader.pipeTo(dataTransform.convertWriterToStream(writer))
    })
  }
}

window.customElements.define('passway-registration', PasswayRegistration)

const passwayRegistration = document.createElement('passway-registration')
passwayRegistration.setAttribute('app-name', 'Passway Demo')
passwayRegistration.setAttribute('user-name', 'example-user')
passwayRegistration.setAttribute('user-display-name', 'Example User')

document.body.appendChild(passwayRegistration)
