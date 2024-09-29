---
title: "Odinbook - Progress Update"
date: 2024-03-16
last_modified_at: 2024-04-21
categories:
  - Personal Development
---
## Intro
It is now april 2nd, I finished the final project for the ruby on rails course on the odin project, a social media site. Feel free to check it out on my [github](https://github.com/MclPio/odinbook).

## Challenges
I have faced a few challenges I would like to share here.

1. My nested comments. Specifically the ```comment.comments``` or the replies to comments. I have designed the database schema to have a nesting of 1 level.
   I managed to get everything to render properly, looks legit thanks to [Bulma.io](https://bulma.io/). BUT when there are tons of comments, page load times slow down so what is the solution?

   PAGINATION!
   
   Thanks to [Pagy](https://github.com/ddnexus/pagy) gem, I was able to easily paginate my parent comments and
   implement infinite scrolling with the help of [turbo streams](https://turbo.hotwired.dev/handbook/streams).
  
    ```erb
      # app/views/posts/show.html.erb

      <div class="buttons has-addons is-right">
        <%= link_to "Back to posts", posts_path, class: "button is-link" %>
        <% if current_user.posts.include?(@post) %>
          <%= link_to "Edit this post", edit_post_path(@post), class: "button is-warning" %>
          <%= button_to "Destroy this post", @post, method: :delete, class: "button is-danger", data: { turbo: false } %>
        <% end %>
      </div>
      <div class="column is-four-fifths">
        <%= render partial: 'post', locals: { show_view: true, post: @post } %>
      </div>
      <div>
        <%= render partial: "comments/form", locals: { post: @post, parent: nil } %>
        <h4 class="title is-4 mb-4 mt-4">Comments</h4>
        <div id="comments">
            <%= turbo_frame_tag :post_comments do %>
              <%= render @post_comments %>
            <% end %>

            <% if @pagy.next.present? %>
              <%= turbo_frame_tag :pagination,
                  loading: :lazy,
                  src: post_path(@post, format: :turbo_stream, page: @pagy.next)
                  %>
            <% end %>
        </div>
      </div>
    ```

    ```erb
      # app/views/show.turbo_stream.erb

      <%= turbo_stream.append :post_comments do %>
        <%= render @post_comments %>
      <% end %>

      <%= turbo_stream.replace :pagination do %>
        <% if @pagy.next.present? %>
          <%= turbo_frame_tag :pagination,
                              loading: :lazy,
                              src: post_path(@post, format: :turbo_stream, page: @pagy.next) %>
        <% end %>
      <% end %>
    ```

    ```ruby
      # app/controllers/posts_controller.rb show

      def show
        @post_comments = @post.comments.where(parent_id: nil).includes([:user]).order(id: :desc)

        @pagy, @post_comments = pagy_countless(@post_comments, items: 10)

        respond_to do |format|
          format.html
          format.turbo_stream
        end
      end
    ```

    ```erb
      #app/views/comments/_comment.html.erb

      <div id="<%= dom_id comment %>" class="media">
        <figure class="media-left">
          <%= render partial: 'users/shared/profile_avatar', locals: {user: comment.user}%>
        </figure>
        <div class="media-content">
          <div class="content">
            <p>
              <%= link_to comment.user.username, user_path(comment.user), data: {turbo: false} %>
              <small>
                <time datetime="<%= comment.created_at.iso8601 %>"><%= comment.created_at.strftime("%b %d, %Y") %></time>
              </small>
              <br/>
              <%= comment.body %>
            </p>
          </div>
          <%# COMMENT FORM FOR REPLIES%>
          <div data-controller="comment-form">
            <div class="level is-mobile">
              <div class="level-left">
                <div class="level-item">
                  <%= render partial: "comments/likes", locals: { comment: comment } %>
                </div>
                <% if comment.depth == 0 %>
                  <div class="level-item"><%= link_to "Reply", "#", data: { action: "click->comment-form#toggleForm" } %></div>
                <% end %>
              </div>
            </div>
            <div class="comment-form hide" data-comment-form-target="form" >
              <%= render partial: "comments/form", locals: {post: comment.post, parent: comment } %>
            </div>
          </div>
          <%# COMMENT REPLIES %>
          <% if comment.depth == 0 %>
            <div id = "<%= dom_id comment %>_replies" class="mt-4">
              <%# render comment.comments.includes([:user, :post]).order(id: :desc).limit(1) %>
                <%= render comment.comments.includes([:user, :post]).order(id: :desc).limit(1) %>
                <% unless comment.comments.includes([:comments]).empty? %>
                  <%= link_to "Show More", post_comments_path(parent_id: comment.id, post_id: comment.post_id), data: { turbo: false } %>
                <% end %>
            </div>
          <% end %>
        </div>
        <div class="media-right">
          <% if current_user == comment.user %>
            <%= link_to "Edit", edit_post_comment_path(comment.post ,comment) %>
            <%= link_to "Delete", post_comment_path(comment.post, comment),
                  data: { turbo_method: :delete,
                          turbo_confirm: "Are you sure?"} %>
          <% end %>
        </div>
      </div>
    ```

    ```ruby
      # config/routes.rb

        resources :posts do
          resources :comments, only: [:create, :update, :edit, :destroy, :index]
        end
    ```
    So in the end, I have the parent comments paginate but their children, only displayed and
    if a user wants more replies, they have to call the index action of comments

    posts#show view:
    ![comments image parent](/assets/img/2024-04-03-parent-comment.png)

    comments#index view:
    ![comments image children](/assets/img/2024-04-03-child-comments.png)

    This remains unsolved... is the solution in refactoring the controllers? routes? or can this simply be fixed with some tweaks to the views?

2. Deployment... I deployed 2 rails apps before with my Paas provider but for some reason, this time it wants to spew out errors and not deploy in 1 command like I would expect them to. What will I do? Try again later, maybe using a different devise. As it happened before that deployments failed because of issues with the Paas service and not my configuration, I will leave the troubleshooting for later. 
> Update: I found out too little RAM allocated to server can cause all types of issues, for example my database seed was not working due to low memory, I found the problem from checking the live server logs, easy fix.

3. Testing. This has been my first time trying to seriously implement tests when developing an application. I thought I would be developing mediocre tests at best and as it turns out I did. As my UI changed, I am sure some of my system tests would fail but oh well. 
> Update: So I managed to update all my system and model tests for my newly updated UI, I even found an issue caused by Turbo for when a user would like to update their comments. I was quite happy as my tests actually did help me catch an issue after I updated my app's UI.

4. Features I did not add. Notifications and real time messaging. I do feel FOMO for not doing them but I am afraid it will take more time than necessary to implement and would be outside of the scope of this project. Another one is AWS image storage which was a recommended bonus to add. 

5. Designing the database. Everything from writing migrations, model validations, relationships to custom model methods did take a considerable effort to implement and test.

## Cool things I found

1. [Stimulus Components ](https://www.stimulus-components.com/)
   A cool component library for stimulus, I picked out the stimulus notification component which makes alerts
   that you can close and they automatically disappear after a set time. Very easy install time and required very litter effort. I did struggle to figure out which installation to use at first, I used yarn by mistake when I should have used import maps. There are other components like Character Counter and Timeago that could add quality improvement in the app as well.

2. [Faker](https://github.com/faker-ruby/faker)
   A great way to create seed the database with accounts and quotes. I personally added some once piece and skyrim spice to my database seed.

3. [Bullet](https://github.com/flyerhzm/bullet)
   Helped me find bad queries and advised me to implement counter caching. I must say, I really enjoy making fast requests which is one of the reasons I wanted to add Pagy; to improve page load times. There is definitely tons of work that can be done to keep improving load times.

## Closing

Alright, that is all I have to say for today. All that is left now is to deploy and move on to frontend focused courses on [the odin project](https://www.theodinproject.com/paths/full-stack-ruby-on-rails). Maybe exciting projects like Open Source or Indie Hacking...