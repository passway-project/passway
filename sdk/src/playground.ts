/* c8 ignore start */
import { PasswayClient } from './'

class PasswayRegistration extends HTMLElement {
  private client = new PasswayClient({
    apiRoot: 'http://localhost:3123/api',
  })

  private templateHTML = `
<style>
button {
  display: block;
  margin: 1rem;
  font-size: 1rem;
}
</style>

<h1><code>passwayClient</code></h1>
<button class="create-passkey"><code>createPasskey()</code></button>
<button class="create-user"><code>createUser()</code></button>
<button class="create-session"><code>createSession()</code></button>
<button class="destroy-session"><code>destroySession()</code></button>
<input class="upload" type="file" />
`

  connectedCallback() {
    const template = document.createElement('template')
    template.innerHTML = this.templateHTML

    if (!(template instanceof HTMLTemplateElement)) {
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

      await this.client.upload(file, 'upload-test')
    })
  }
}

window.customElements.define('passway-registration', PasswayRegistration)

const passwayRegistration = document.createElement('passway-registration')
passwayRegistration.setAttribute('app-name', 'Passway Demo')
passwayRegistration.setAttribute('user-name', 'example-user')
passwayRegistration.setAttribute('user-display-name', 'Example User')

document.body.appendChild(passwayRegistration)
