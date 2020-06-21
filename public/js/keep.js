var success_keep = 10 * 60 * 1000;
var error_keep = 3 * 60 * 1000;

function keep(delay) {
    var timer = setInterval(function () {
        clearInterval(timer);
        $.ajax({
            url: '/uTool/renew',
            type: 'GET',
            dataType: 'json',
            data: {},
            success: function (data, status, xhr) {
                //console.log(status);
                keep(success_keep);
            },
            error: function (xhr, status, error) {
                //console.log(status);
                keep(error_keep);
            }
        })
    }, delay);
}

keep(success_keep);