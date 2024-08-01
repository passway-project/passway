import type { Meta, StoryObj } from '@storybook/html'

import { passwayClient } from '..'
import { PasskeyConfig } from '../types'

class RegistrationStory extends HTMLElement {
  private client = passwayClient

  private templateHTML = `
<style>
button {
  display: block;
  margin: 1rem;
  font-size: 1rem;
}
</style>

<h1>Passway Registration</h1>
<button class="create-passkey"><code>createPasskey()</code></button>
<button class="create-user"><code>createUser()</code></button>
`

  connectedCallback() {
    const template = document.createElement('template')
    template.innerHTML = this.templateHTML

    if (!(template instanceof HTMLTemplateElement)) {
      throw new TypeError()
    }

    const shadow = this.attachShadow({ mode: 'open' })
    shadow.appendChild(template.content.cloneNode(true))

    const createPasskeyButton = shadow.querySelector('button.create-passkey')

    if (!(createPasskeyButton instanceof HTMLButtonElement)) {
      throw TypeError()
    }

    createPasskeyButton.addEventListener('click', async () => {
      await this.client.createPasskey({
        appName: this.getAttribute('app-name') ?? '',
        userName: this.getAttribute('user-name') ?? '',
        userDisplayName: this.getAttribute('user-display-name') ?? '',
      })
    })

    const createUserButton = shadow.querySelector('button.create-user')

    if (!(createUserButton instanceof HTMLButtonElement)) {
      throw TypeError()
    }

    createUserButton.addEventListener('click', async () => {
      await this.client.createUser({
        apiRoot: 'http://localhost:3123/api',
      })
    })
  }
}

// NOTE: This is a workaround for Storybook's lack of hot module reload support for Storybook
try {
  window.customElements.define('story-registration', RegistrationStory)
} catch (e) {
  window.location.reload()
  console.error(e)
}

export default {
  title: 'Registration',
  tags: ['autodocs'],
  render: ({ appName, userDisplayName, userName }) => {
    return `<story-registration app-name="${appName}" user-display-name="${userDisplayName}" user-name="${userName}"/>`
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
} satisfies Meta<PasskeyConfig>

export const Primary: StoryObj<PasskeyConfig> = {
  args: {},
}
