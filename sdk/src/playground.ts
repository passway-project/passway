/* c8 ignore start */
import window from 'global/window'
import { createWriteStream } from 'streamsaver'

import { dataTransform } from './services/DataTransform'

import { PasswayClient } from './'

class PasswayRegistration extends HTMLElement {
  private client = new PasswayClient({
    apiRoot: 'http://localhost:3123/api',
  })

  private objectLinkList: HTMLUListElement | undefined | null

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

    this.objectLinkList =
      shadow.querySelector<HTMLUListElement>('ul.object-links')

    shadow
      .querySelector('button.list-content')
      ?.addEventListener('click', async () => {
        const contentList = await this.client.listContent()

        const { objectLinkList } = this

        if (objectLinkList) {
          while (objectLinkList.lastChild) {
            objectLinkList.removeChild(objectLinkList.lastChild)
          }

          for (const content of contentList) {
            const objectLink = document.createElement('passway-object-link')

            if (!(objectLink instanceof PasswayObjectLink)) {
              throw new Error()
            }

            objectLink.contentId = content.contentId
            objectLink.contentSize = content.contentSize
            objectLink.isEncrypted = content.isEncrypted
            objectLink.client = this.client

            objectLinkList.appendChild(objectLink)
          }
        }
      })
  }
}

class PasswayObjectLink extends HTMLElement {
  client: PasswayClient | undefined

  isEncrypted = true

  private button: HTMLButtonElement | undefined | null

  private handleButtonClick = async () => {
    const { client, _contentId: contentId, contentSize, isEncrypted } = this

    if (contentId && client) {
      const reader = await client.download(contentId ?? '', { isEncrypted })

      const writeStream = createWriteStream('download', {
        size: contentSize,
      })

      const writer = writeStream.getWriter()
      reader.pipeTo(dataTransform.convertWriterToStream(writer))
    }
  }

  private _contentId: string | undefined
  contentSize: number | undefined

  private updateButtonLabel = () => {
    if (this.button) {
      this.button.innerText = `Download ${this._contentId} (${this.isEncrypted ? 'encrypted' : 'not encrypted'})`
    }
  }

  set contentId(contentName: string) {
    this._contentId = contentName
    this.updateButtonLabel()
  }

  connectedCallback() {
    const template = document.querySelector<HTMLTemplateElement>(
      'template.object-link'
    )

    if (!template) {
      throw new TypeError()
    }

    const shadow = this.attachShadow({ mode: 'open' })
    shadow.appendChild(template.content.cloneNode(true))

    this.button = shadow.querySelector('button')
    this.button?.addEventListener('click', this.handleButtonClick)
    this.updateButtonLabel()
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.handleButtonClick)
  }
}

window.customElements.define('passway-registration', PasswayRegistration)
window.customElements.define('passway-object-link', PasswayObjectLink)

const passwayRegistration = document.createElement('passway-registration')
passwayRegistration.setAttribute('app-name', 'Passway Demo')
passwayRegistration.setAttribute('user-name', 'example-user')
passwayRegistration.setAttribute('user-display-name', 'Example User')

document.body.appendChild(passwayRegistration)
