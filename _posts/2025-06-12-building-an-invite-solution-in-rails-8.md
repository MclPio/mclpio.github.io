---
title: "Building an invitation solution in Rails 8"
date: 2025-05-16
categories:
  - Ruby on rails
  - Authentication
tags:
  - productivity
description: How I added an invitation solution to the built in rails 8 authentication solution so sign ups require an invitation code.
---

# Introduction
I'm soon deploying *Artifacts,* an LLM chat application designed to accelerate creative work through pre-defined prompts called *Stencils.* But what I do not want to deal with is uncontrollable user sign ups, so I thought the solution to implement would be an invitation system.

## Problem
Allowing open registrations for *Artifacts* would lead to a flood of database writes, likely overwhelming a small virtual server, especially with limited RAM. Beyond infrastructure, I'd face the complex task of batching chat interactions and persisting them efficiently; a significant development overhead I prefer to sidestep. My core goal is to provide flexible LLM access, and an invitation system offers a clean solution to these scaling and complexity concerns.

## The Code

### Migrations and Initial Models
I started by defining the `Invites` model. After a few iterations, this is how the table in my schema looks:

```ruby
#schema.rb
create_table "invites", force: :cascade do |t|
  t.string "invite_code", null: false
  t.integer "created_by_id", null: false
  t.integer "used_by_id"
  t.datetime "expires_at"
  t.datetime "created_at", null: false
  t.datetime "updated_at", null: false
  t.index ["created_by_id"], name: "index_invites_on_created_by_id"
  t.index ["invite_code"], name: "index_invites_on_invite_code", unique: true
  t.index ["used_by_id"], name: "index_invites_on_used_by_id"
end
```

The `invite_code` is a required, unique string. `created_by_id` links the invite to the admin who generated it, while `used_by_id` is an optional foreign key for the user who redeems it. Finally, `expires_at` provides an optional expiry date for the code.

Here's how the `User` and `Invite` models interact:

```ruby
# app/models/user.rb
class User < ApplicationRecord
# ... code hidden for brevity
  has_many :invites, foreign_key: :created_by_id
  has_one :used_invite, class_name: "Invite", foreign_key: :used_by_id
  attr_accessor :invite_code
  validate :invite_code_must_be_valid, on: :create
  after_create_commit :mark_invite_as_used
end
```

```ruby
# app/models/invite.rb
class Invite < ApplicationRecord
  belongs_to :admin, class_name: "User", foreign_key: :created_by_id
  belongs_to :user, class_name: "User", optional: true, foreign_key: :used_by_id

  before_validation :generate_code, on: :create
  before_destroy :ensure_destroyable

  validates :invite_code, presence: true, uniqueness: true
  validates :created_by_id, presence: true
  validate :expires_at_must_be_future, if: -> { expires_at.present? }

  def active?
    used_by_id.nil? && (expires_at.nil? || expires_at.future?)
  end

  def self.valid_code?(code)
    find_by(invite_code: code)&.active?
  end

  private

  def generate_code
    self.invite_code = SecureRandom.alphanumeric(10) if invite_code.blank?
  end

  def expires_at_must_be_future
    errors.add(:expires_at, "must be in the future") if expires_at <= Time.current
  end

  def ensure_destroyable
    if used_by_id.present?
      errors.add(:base, "Cannot delete invite code that has been used by a registered user")
      throw(:abort)
    end
  end
end
```

### The Business Logic

#### Invites

The `Invite` model handles the core invite logic. A `before_validation` callback, `generate_code`, automatically creates a 10-character alphanumeric code. The `active?` method checks if an invite is valid for use; it must be unused, and unexpired. For convenience, `self.valid_code?` provides a quick check for an invite's validity. A `before_destroy` callback, `ensure_destroyable`, prevents deletion of any invite that has already been used, maintaining data integrity.

You could argue that `generate_code` should be in a loop to handle duplicate invite codes, but the chances of that is very small and I am not writing a loop. The admin which is **ME** can just click generate code again.

#### User Registration with Invites

Integrating the invite system into user registration involved changes to both the `User` model and `RegistrationsController`.

In the `User` model, I used `attr_accessor :invite_code` to allow the invite code to be passed during registration without a dedicated database column. A custom validation, `invite_code_must_be_valid`, checks the submitted code, ensuring it's active and valid before a new user is created. If the code is invalid, registration fails.

```ruby
# app/models/user.rb (continued)
# ...
  def invite_code_must_be_valid
    unless Invite.valid_code?(invite_code)
      errors.add(:invite_code, "is invalid or expired")
    end
  end

  def mark_invite_as_used
    @invite = Invite.find_by(invite_code: invite_code)
    return unless @invite && persisted?
    @invite.update!(used_by_id: id)
  end
```

After a user successfully registers, the `after_create_commit :mark_invite_as_used` callback updates the invite, linking it to the new user and deactivating it for future use.

### Controller Logic

The `InvitesController` manages all aspects of invite codes:

```ruby
# app/controllers/invites_controller.rb
class InvitesController < ApplicationController
  before_action :authorize_admin

  def index
    @invites = Current.user.invites
  end

  def new
    @invite = Current.user.invites.new
  end

  def create
    @invite = Current.user.invites.new(invite_params)
    if @invite.save
      redirect_to invites_path
    else
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    @invite = Invite.find(params[:id])
    @invite.destroy!
    redirect_to invites_path, notice: "Invite code was successfully deleted."
  rescue ActiveRecord::RecordNotDestroyed
    redirect_to invites_path, alert: @invite.errors.full_messages.join(', ')
  end

  private

  def invite_params
    params.expect(invite: [ :expires_at ])
  end

  def authorize_admin
    return if Current.user.account_type_admin?
    redirect_to root_path, alert: "Not found."
  end
end
```

Access to `InvitesController` actions is restricted to **admin users** via a `before_action :authorize_admin`. This ensures only authorized personnel can generate and manage invites. The `index` action displays all invites created by the current admin. `new` and `create` handle invite generation, with error handling for invalid submissions. The `destroy` action allows admins to delete unused invites, providing clear feedback if a used invite is targeted.

The `RegistrationsController` was also updated:

```ruby
# app/controllers/registrations_controller.rb
class RegistrationsController < ApplicationController
  # ...
  def create
    @user = User.new(registration_params)
    if @user.save
      start_new_session_for @user
      redirect_to root_path, notice: "Successfully signed up!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def registration_params
    params.require(:user).permit(:name, :email_address, :password, :password_confirmation, :invite_code)
  end
end
```

The key change here is in `registration_params`, which now permits the `invite_code` field, allowing it to be processed during user creation.

### User Interface

For administrators, the invite management page presents a clear overview of all generated codes, showing their status, expiry, and redemption details. There's an easy way to create new invites and delete unused ones.

<img src="/assets/img/2025-06-12-invite-index.png" alt="Invite index page">

The invite creation form focuses on simplicity, allowing administrators to set an optional expiration date. An informational note explains that codes are automatically generated.

<img src="/assets/img/2025-06-12-invite-create.png" alt="Invite new page">

On the user registration side, the sign-up form now includes a dedicated "Invite Code" field. **Validation errors are clearly displayed** both generally and for specific fields, guiding users to correct any issues, including an invalid or expired invite code.

<img src="/assets/img/2025-06-12-invite-registeration-page.png" alt="Invite new page">

### Routing

To tie it all together, I defined the routes:

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # ... existing routes
  resource :registration, only: [:new, :create]
  resources :invites, only: [ :index, :new, :create, :destroy ]
  # ... other routes
end
```
Using `resources :invites` automatically sets up the necessary RESTful paths, making the invite management accessible.

## Conclusion

This invitation system for *Artifacts* addresses the requirements that I need which is controlled user sign ups. The implementation delivers admin oversight and a smooth, guided entry for new users, allowing *Artifacts* to grow deliberately while ensuring resource stability.
