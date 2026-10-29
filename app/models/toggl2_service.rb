# frozen_string_literal: true

require 'net/http'

# Toggl 2.0 web service helper.
#
# Works like TogglService, but talks to the Toggl 2.0 API. That API is
# scoped to an organization and a workspace and has no way to list them,
# so users enter both IDs in their account settings.
class Toggl2Service
  attr_reader :api_key, :organization_id, :workspace_id

  ENDPOINT = 'https://focus.toggl.com'
  PER_PAGE = 100
  MAX_PAGES = 50

  def initialize(api_key, organization_id, workspace_id)
    @api_key = api_key
    @organization_id = organization_id.to_i
    @workspace_id = workspace_id.to_i
  end

  def source
    'toggl2'
  end

  def web_url
    'https://focus.toggl.com'
  end

  # Loads the user's own time entries from Toggl 2.0.
  def load_time_entries(
    start_date:,
    end_date:,
    workspace_id: nil
  )
    if workspace_id && !workspace_id.is_a?(Integer)
      raise ArgumentError, 'Workspace ID must be a valid integer'
    end

    return [] if workspace_id && workspace_id != @workspace_id

    raw_entries = []
    (1..MAX_PAGES).each do |page|
      rows = get(
        "/api/organizations/#{@organization_id}/workspaces/#{@workspace_id}/time-entries",
        {
          date_from: start_date.utc.iso8601,
          date_to: end_date.utc.iso8601,
          type: 'activity',
          include_taskless: true,
          page: page,
          per_page: PER_PAGE
        }
      )['data']
      break if rows.blank?

      raw_entries.concat(rows)
    end

    # Entries that are only planned have not been tracked yet.
    raw_entries
      .select { |e| e['start'].present? }
      .map { |e| build_time_entry(e) }
  end

  # Toggl 2.0 can't list workspaces, so return the configured one.
  def load_workspaces
    [
      TogglWorkspace.new(
        id: @workspace_id,
        name: I18n.t('t2r.label_toggl2_workspace', id: @workspace_id)
      )
    ]
  end

  private

  def build_time_entry(data)
    TogglTimeEntry.new(
      id: data['id'],
      workspace_id: data['workspace_id'],
      # The duration is missing while the timer is running.
      duration: data['duration'] || -1,
      at: data['updated_at'],
      description: data['description'].presence || data.dig('task', 'name'),
      source: source
    )
  end

  # Makes a GET request to Toggl 2.0.
  def get(path, data = nil)
    uri = URI(ENDPOINT + path)
    uri.query = data.to_query if data.present?

    request = Net::HTTP::Get.new(uri)
    request['Authorization'] = "Bearer #{@api_key}"
    request['Accept'] = 'application/json'

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    response = http.request(request)

    raise_on_error(request, response)

    JSON.parse(response.body)
  end

  def raise_on_error(request, response)
    return if response.code == '200'

    message = begin
      JSON.parse(response.body)['error_description']
    rescue JSON::ParserError, TypeError
      nil
    end

    raise TogglService::Error.new("Toggl error: #{message || response.body}.", request, response)
  end
end
