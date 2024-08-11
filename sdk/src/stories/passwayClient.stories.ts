import type { Meta, StoryObj } from '@storybook/html'

import { PasswayClient } from '..'
import { PasskeyConfig } from '../types'

const isTopLevel = window.parent === window

class RegistrationStory extends HTMLElement {
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
${isTopLevel ? '' : '<p>ℹ️ NOTE: These methods will fail in the standard Storybook UI because it uses an <code>iframe</code>. Navigate to the story directly in the sidebar and click &ldquo;Open canvas in new tab&ldquo; in the upper right.</p>'}
<button class="create-passkey"><code>createPasskey()</code></button>
<button class="create-user"><code>createUser()</code></button>
<button class="create-session"><code>createSession()</code></button>
<button class="destroy-session"><code>destroySession()</code></button>
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
  }
}

// NOTE: This is a workaround for Storybook's lack of hot module reload support
// for web components
try {
  window.customElements.define('story-registration', RegistrationStory)
} catch (e) {
  window.location.reload()
  console.error(e)
}

export default {
  title: 'passwayClient',
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

export const PublicMethods: StoryObj<PasskeyConfig> = {
  args: {},
}
