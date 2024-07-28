import { passwayClient } from '..'

class RegistrationStory extends HTMLElement {
  private client = passwayClient

  constructor() {
    super()
    console.log(this.client)
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
