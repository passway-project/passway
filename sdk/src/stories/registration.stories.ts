import { passwayClient } from '..'

class RegistrationStory extends HTMLElement {
  private client = passwayClient

  constructor() {
    super()
    console.log(this.client)
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })

    const registrationButton = document.createElement('button')
    registrationButton.innerHTML = `<code>initiateRegistration()</code>`
    registrationButton.addEventListener('click', async () => {
      await this.client.initiateRegistration({
        appName: 'Passway Demo',
        userName: 'example-user',
        userDisplayName: 'Example User',
      })
    })

    shadow.appendChild(registrationButton)
  }
}

window.customElements.define('story-registration', RegistrationStory)

export default {
  title: 'Registration',
  tags: ['autodocs'],
  render: () => {
    return `
<h1>Passway Registration</h1>
<story-registration />
`
  },
}

export const Primary = {}
