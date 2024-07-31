import type { Meta, StoryObj } from '@storybook/html'

import { passwayClient } from '..'
import { RegistrationConfig } from '../types'

class RegistrationStory extends HTMLElement {
  private client = passwayClient

  constructor() {
    super()
    console.log(this.client)
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })

    const registrationButton = document.createElement('button')
    registrationButton.style.display = 'block'
    registrationButton.innerHTML = `<code>register()</code>`
    registrationButton.addEventListener('click', async () => {
      await this.client.register({
        appName: this.getAttribute('app-name') ?? '',
        userName: this.getAttribute('user-name') ?? '',
        userDisplayName: this.getAttribute('user-display-name') ?? '',
      })
    })

    shadow.appendChild(registrationButton)

    const loginButton = document.createElement('button')
    loginButton.style.display = 'block'
    loginButton.innerHTML = `<code>login()</code>`
    loginButton.addEventListener('click', async () => {
      await this.client.login()
    })

    shadow.appendChild(loginButton)
  }
}

window.customElements.define('story-registration', RegistrationStory)

export default {
  title: 'Registration',
  tags: ['autodocs'],
  render: ({ appName, userDisplayName, userName }) => {
    return `
<h1>Passway Registration</h1>
<story-registration app-name="${appName}" user-display-name="${userDisplayName}" user-name="${userName}"/>
`
  },
  args: {
    appName: 'Passway Demo',
    userName: 'example-user',
    userDisplayName: 'Example User',
  },
  argTypes: {
    appName: {
      type: 'string',
    },
    userName: {
      type: 'string',
    },
    userDisplayName: {
      type: 'string',
    },
  },
} satisfies Meta<RegistrationConfig>

export const Primary: StoryObj<RegistrationConfig> = {
  args: {},
}
