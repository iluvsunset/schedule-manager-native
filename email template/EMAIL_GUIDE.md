# EmailJS Template Guide

Here are the recommended settings for your EmailJS dashboard.

## 1. Schedule Created Notification
**Template Name:** `template_eq2zclv` (or your specific ID)
**HTML Source:** `schedulemail.html`
**Subject Line:**
```text
New Event: {{place}} on {{date}}
```
**Variables Used:**
- `to_name`
- `place`
- `date`
- `time`
- `location`
- `notes`

---

## 2. Class Reminder
**Template Name:** `template_reminder`
**HTML Source:** `remindermail.html`
**Subject Line:**
```text
Reminder: {{place}} starts at {{time}}
```
**Variables Used:**
- `to_name`
- `place`
- `time`
- `location`
- `date`

---

## 3. Lesson Review
**Template Name:** `template_review`
**HTML Source:** `review.html`
**Subject Line:**
```text
Lesson Review: {{place}} ({{date}})
```
**Variables Used:**
- `to_email` (System use)
- `place`
- `date`
- `review_learned`
- `review_insights`
- `review_improve`
- `review_notes`

---

## 4. Class Added Notification
**Template Name:** `template_class_added`
**HTML Source:** `classaddedmail.html`
**Subject Line:**
```text
You have been added to {{class_name}}
```
**Variables Used:**
- `to_name`
- `class_name`
- `dashboard_link`
