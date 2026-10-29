# frozen_string_literal: true

class T2rBaseController < ApplicationController
  attr_reader :user

  before_action :require_login, :validate_user

  protected

  attr_reader :toggl_service

  # Checks if the current user has set up Toggl.
  def validate_user
    @user = User.current
    @toggl_service = build_toggl_service
    return if @toggl_service

    flash[:error] = I18n.t(@toggl_setup_error || 't2r.text_add_toggl_api_key')
    redirect_to my_account_path
  end

  # Uses Toggl 2.0 when it is enabled and the user has a key for it,
  # otherwise Toggl Track.
  def build_toggl_service
    pref = @user.pref
    if Toggl2Redmine.toggl2_enabled? && pref.toggl2_api_key.present?
      organization_id = pref.toggl2_organization_id.to_s
      workspace_id = pref.toggl2_workspace_id.to_s
      unless organization_id.match?(/\A\d+\z/) && workspace_id.match?(/\A\d+\z/)
        @toggl_setup_error = 't2r.text_add_toggl2_ids'
        return
      end

      return Toggl2Service.new(pref.toggl2_api_key, organization_id, workspace_id)
    end

    field = UserCustomField.find_by_name('Toggl API Token')
    token = @user.custom_field_value(field)
    TogglService.new(token) if token.present?
  end

  def user_can_view_issue?(issue)
    return true if @user.admin?

    user_is_member_of?(@user, issue.project)
  end

  def user_is_member_of?(user, project)
    Member.exists?(user: user, project: project)
  end
end
